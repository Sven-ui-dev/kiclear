// POST /api/generate – Start document generation job (async via waitUntil)
export const dynamic    = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro: bis zu 300s – waitUntil braucht Zeit für 7–12 Docs
import { NextRequest } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { parseBody, E, requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { classify } from '@/lib/classifier';
import { determineRequiredDocuments } from '@/config/documents';
import { generateBundle, formatDocumentContent } from '@/lib/generator';
import { uploadDocumentMarkdown, uploadBundle, getSignedUrl } from '@/lib/storage';
import type { AssessmentAnswers, GenerationContext, DocumentType } from '@/types';
import archiver from 'archiver';
import { Writable } from 'stream';

const schema = z.object({
  assessment_id: z.string().uuid(),
  force_regen:   z.boolean().optional().default(false),
  update_reason: z.string().optional().nullable(),
  law_reference: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  // 1. Load assessment
  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('*')
    .eq('id', data.assessment_id)
    .eq('user_id', auth.user.id)
    .single();

  if (!assessment) return E.notFound('Assessment');

  // 2. Check active subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .single();

  if (!sub) return E.noSubscription();

  try {
    const answers    = assessment.answers as Partial<AssessmentAnswers>;
    const classResult = classify(answers);
    const land       = (answers.A3 ?? 'DE') as 'DE' | 'AT';

    // 3. Get company name from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_name')
      .eq('id', auth.user.id)
      .single();

    const ctx: GenerationContext = {
      answers,
      riskClass:   classResult.risk_class,
      score:       classResult.score,
      gaps:        classResult.gaps,
      companyName: profile?.company_name ?? 'Ihr Unternehmen',
      land,
    };

    const docTypes      = determineRequiredDocuments(ctx) as DocumentType[];
    const bundleVersion = (assessment.bundle_version ?? 0) + 1;

    // 4. Create bundle record – synchronous, fast
    const { data: bundle } = await supabaseAdmin
      .from('document_bundles')
      .insert({
        user_id:               auth.user.id,
        assessment_id:         data.assessment_id,
        version:               bundleVersion,
        status:                'generating',
        docs_total:            docTypes.length,
        update_reason:         data.update_reason ?? null,
        law_reference:         data.law_reference ?? null,
        generation_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!bundle) return E.internal('Bundle-Erstellung fehlgeschlagen.');

    // 5. Generierung asynchron – waitUntil hält die Vercel-Function am Leben
    //    ohne den Client blockieren zu müssen
    waitUntil(
      runGeneration({
        bundleId:      bundle.id,
        bundleVersion,
        userId:        auth.user.id,
        assessmentId:  data.assessment_id,
        docTypes,
        ctx,
        updateReason:  data.update_reason ?? null,
        lawReference:  data.law_reference ?? null,
      })
    );

    // 6. Sofort antworten – Dashboard pollt bundle_id
    return Response.json({
      bundle_id: bundle.id,
      version:   bundleVersion,
      status:    'generating',
      docs_total: docTypes.length,
    });

  } catch (e) {
    console.error('[/api/generate]', e);
    return E.internal();
  }
}

// ── Background generation worker ─────────────────────────────────────────────
async function runGeneration(opts: {
  bundleId:     string;
  bundleVersion: number;
  userId:       string;
  assessmentId: string;
  docTypes:     DocumentType[];
  ctx:          GenerationContext;
  updateReason: string | null;
  lawReference: string | null;
}) {
  const { bundleId, bundleVersion, userId, assessmentId, docTypes, ctx, updateReason, lawReference } = opts;

  try {
    // Generate all documents
    const generated = await generateBundle(docTypes, ctx, async (done) => {
      await supabaseAdmin
        .from('document_bundles')
        .update({ docs_done: done })
        .eq('id', bundleId);
    });

    const successDocs = generated.filter(g => !g.error && g.content);
    const failedDocs  = generated.filter(g => g.error || !g.content);
    console.log('[Generate] Docs OK:', successDocs.length, 'Failed:', failedDocs.length);
    if (failedDocs.length > 0) {
      console.error('[Generate] Failed docs:', failedDocs.map(g => `${g.docType}: ${g.error}`).join(', '));
    }

    if (successDocs.length === 0) {
      const firstError = generated[0]?.error ?? 'Alle Dokumente fehlgeschlagen';
      console.error('[Generate] Aborting – no successful docs:', firstError);
      await supabaseAdmin
        .from('document_bundles')
        .update({ status: 'error' })
        .eq('id', bundleId);
      return;
    }

    // Upload each document
    const docRecords: Array<{ id: string; doc_type: string; storage_path: string }> = [];
    const now = new Date();

    for (const gen of generated) {
      if (gen.error) continue;

      const formattedContent = formatDocumentContent(
        gen.docType, gen.content, ctx.companyName ?? 'Ihr Unternehmen', now
      );

      const { data: docRecord } = await supabaseAdmin
        .from('documents')
        .insert({
          user_id:       userId,
          assessment_id: assessmentId,
          bundle_id:     bundleId,
          doc_type:      gen.docType,
          version:       bundleVersion,
          status:        'ready',
          content_raw:   formattedContent,
          update_reason: updateReason,
          law_reference: lawReference,
          generated_at:  now.toISOString(),
        })
        .select()
        .single();

      if (docRecord) {
        const storagePath = await uploadDocumentMarkdown(
          userId, docRecord.id, gen.docType, formattedContent, bundleVersion
        );
        await supabaseAdmin
          .from('documents')
          .update({ storage_path: storagePath })
          .eq('id', docRecord.id);

        docRecords.push({ id: docRecord.id, doc_type: gen.docType, storage_path: storagePath });
      }
    }

    // Create ZIP
    const zipBuffer = await createZipBundle(generated, ctx, now, bundleVersion);
    const zipPath   = await uploadBundle(userId, bundleId, zipBuffer, bundleVersion);
    const zipUrl    = await getSignedUrl(zipPath);

    // Mark bundle ready
    await supabaseAdmin
      .from('document_bundles')
      .update({
        status:                  'ready',
        zip_path:                zipPath,
        zip_signed_url:          zipUrl,
        docs_done:               docRecords.length,
        generation_completed_at: now.toISOString(),
      })
      .eq('id', bundleId);

    // Update assessment version
    await supabaseAdmin
      .from('assessments')
      .update({ bundle_version: bundleVersion, updated_at: new Date().toISOString() })
      .eq('id', assessmentId);

    console.log(`[Generate] ✓ Bundle ${bundleId} fertig – ${docRecords.length}/${docTypes.length} Docs`);

  } catch (e) {
    console.error('[Generate] runGeneration Fehler:', e);
    await supabaseAdmin
      .from('document_bundles')
      .update({ status: 'error' })
      .eq('id', bundleId);
  }
}

// ── Create ZIP from generated documents ──────────────────────────────────────
async function createZipBundle(
  generated: Array<{ docType: DocumentType; content: string; tokens: number; error?: string }>,
  ctx: GenerationContext,
  generatedAt: Date,
  version: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const writable = new Writable({
      write(chunk, _enc, cb) { buffers.push(chunk); cb(); },
    });
    writable.on('finish', () => resolve(Buffer.concat(buffers)));

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(writable);

    archive.append(Buffer.from(createReadme(ctx, generatedAt, version), 'utf-8'), { name: 'README.txt' });

    for (const gen of generated) {
      if (!gen.error && gen.content) {
        const content     = formatDocumentContent(gen.docType, gen.content, ctx.companyName ?? 'Ihr Unternehmen', generatedAt);
        const safeDocType = gen.docType.replace(/[^a-zA-Z0-9_-]/g, '_');
        archive.append(Buffer.from(content, 'utf-8'), { name: `${safeDocType}.md` });
      }
    }

    archive.finalize();
  });
}

function createReadme(ctx: GenerationContext, date: Date, version: number): string {
  return `kiclear.ai – EU AI Act Nachweispaket
========================================
Unternehmen: ${ctx.companyName ?? 'Ihr Unternehmen'}
Erstellt: ${date.toLocaleDateString('de-DE')}
Version: ${version}
Risikoklasse: ${ctx.riskClass}
Compliance-Score: ${ctx.score}/100

Inhalt dieses Pakets
--------------------
Dieses Paket enthält alle generierten EU AI Act Compliance-Dokumente für Ihr Unternehmen.

WICHTIGER HINWEIS
-----------------
Dieses Dokument-Bundle wurde automatisch durch kiclear.ai (Tocay Operations UG)
erstellt und dient als technisches Hilfsmittel. Es ersetzt keine individuelle
Rechtsberatung. Für verbindliche Rechtssicherheit empfehlen wir die Prüfung
durch einen auf KI-Recht spezialisierten Rechtsanwalt.

Tocay Operations UG (haftungsbeschränkt) | Marbach am Neckar | kiclear.ai`;
}

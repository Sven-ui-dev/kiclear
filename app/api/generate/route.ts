// POST /api/generate – Start document generation job
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
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
    const answers = assessment.answers as Partial<AssessmentAnswers>;
    const classResult = classify(answers);
    const land = (answers.A3 ?? 'DE') as 'DE' | 'AT';  // CH entfernt

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

    const docTypes = determineRequiredDocuments(ctx) as DocumentType[];

    // 4. Create bundle record
    const bundleVersion = (assessment.bundle_version ?? 0) + 1;
    const { data: bundle } = await supabaseAdmin
      .from('document_bundles')
      .insert({
        user_id:        auth.user.id,
        assessment_id:  data.assessment_id,
        version:        bundleVersion,
        status:         'generating',
        docs_total:     docTypes.length,
        update_reason:  data.update_reason ?? null,
        law_reference:  data.law_reference ?? null,
        generation_started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!bundle) return E.internal('Bundle-Erstellung fehlgeschlagen.');

    // 5. Generate all documents in parallel
    const generated = await generateBundle(docTypes, ctx, async (done, total, docType) => {
      // Update progress in DB
      await supabaseAdmin
        .from('document_bundles')
        .update({ docs_done: done })
        .eq('id', bundle.id);
    });

    // 6. Upload each document and create DB records
    const docRecords: Array<{ id: string; doc_type: string; storage_path: string }> = [];
    const now = new Date();

    for (const gen of generated) {
      if (gen.error) continue;

      const formattedContent = formatDocumentContent(
        gen.docType, gen.content, ctx.companyName ?? 'Ihr Unternehmen', now
      );

      // Create document record
      const { data: docRecord } = await supabaseAdmin
        .from('documents')
        .insert({
          user_id:        auth.user.id,
          assessment_id:  data.assessment_id,
          bundle_id:      bundle.id,
          doc_type:       gen.docType,
          version:        bundleVersion,
          status:         'ready',
          content_raw:    formattedContent,
          update_reason:  data.update_reason ?? null,
          law_reference:  data.law_reference ?? null,
          generated_at:   now.toISOString(),
        })
        .select()
        .single();

      if (docRecord) {
        // Upload to storage
        const storagePath = await uploadDocumentMarkdown(
          auth.user.id, docRecord.id, gen.docType, formattedContent, bundleVersion
        );
        await supabaseAdmin
          .from('documents')
          .update({ storage_path: storagePath })
          .eq('id', docRecord.id);

        docRecords.push({ id: docRecord.id, doc_type: gen.docType, storage_path: storagePath });
      }
    }

    // 7. Create ZIP bundle
    const zipBuffer = await createZipBundle(generated, ctx, now, bundleVersion);
    const zipPath = await uploadBundle(auth.user.id, bundle.id, zipBuffer, bundleVersion);
    const zipUrl = await getSignedUrl(zipPath);

    // 8. Update bundle as complete
    await supabaseAdmin
      .from('document_bundles')
      .update({
        status:                  'ready',
        zip_path:                zipPath,
        zip_signed_url:          zipUrl,
        docs_done:               docRecords.length,
        generation_completed_at: new Date().toISOString(),
      })
      .eq('id', bundle.id);

    // 9. Update assessment version
    await supabaseAdmin
      .from('assessments')
      .update({ bundle_version: bundleVersion, updated_at: new Date().toISOString() })
      .eq('id', data.assessment_id);

    return Response.json({
      bundle_id:           bundle.id,
      version:             bundleVersion,
      status:              'ready',
      docs_generated:      docRecords.length,
      docs_total:          docTypes.length,
      zip_url:             zipUrl,
      zip_expires_at:      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      generated_at:        now.toISOString(),
    });

  } catch (e) {
    console.error('[/api/generate]', e);
    return E.internal();
  }
}

// ── Create ZIP from generated documents ──────────────────────────────────────
async function createZipBundle(
  generated: Array<{ docType: DocumentType; content: string; error?: string }>,
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

    // README
    archive.append(Buffer.from(createReadme(ctx, generatedAt, version), 'utf-8'), { name: 'README.txt' });

    // Documents
    for (const gen of generated) {
      if (!gen.error && gen.content) {
        const { formatDocumentContent, DOCUMENT_META } = require('@/config/documents');
        const content = formatDocumentContent(gen.docType, gen.content, ctx.companyName ?? 'Ihr Unternehmen', generatedAt);
        const label = DOCUMENT_META[gen.docType]?.label?.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, '') ?? gen.docType;
        archive.append(Buffer.from(content, 'utf-8'), { name: `${gen.docType}_${label}.md` });
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

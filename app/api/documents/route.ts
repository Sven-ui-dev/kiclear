// build: 2026-03-22
// GET /api/documents – Dokumente, Bundles oder Assessment abrufen
// ?type=bundles    → alle document_bundles des Nutzers
// ?type=assessment → letztes Assessment
// ?bundle_id=uuid  → einzelne Dokumente eines Bundles
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { E, requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { searchParams } = new URL(req.url);
  const type     = searchParams.get('type');
  const bundleId = searchParams.get('bundle_id');

  try {
    // ── Bundles ──────────────────────────────────────────────────────────────
    if (type === 'bundles') {
      const { data: bundles, error } = await supabaseAdmin
        .from('document_bundles')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) return E.internal();

      // Attach fresh signed URLs for ready bundles
      // DB column is zip_signed_url (not zip_url) – remap for frontend
      const STUCK_MS = 10 * 60 * 1000; // 10 min
      const bundlesWithUrls = await Promise.all(
        (bundles ?? []).map(async (b: Record<string, unknown>) => {
          // Detect stuck generating bundles (started > 10 min ago)
          let status = b.status as string;
          if (status === 'generating' && b.generation_started_at) {
            const startedAt = new Date(b.generation_started_at as string).getTime();
            if (Date.now() - startedAt > STUCK_MS) {
              status = 'error';
              // Reset in DB so user can retry
              await supabaseAdmin
                .from('document_bundles')
                .update({ status: 'error' })
                .eq('id', b.id as string);
            }
          }
          // zip_signed_url is what the generate route writes; fall back to fresh signed URL
          let zip_url = (b.zip_signed_url as string | null) ?? null;
          if (status === 'ready' && b.zip_path && !zip_url) {
            try { zip_url = await getSignedUrl(b.zip_path as string); } catch { /* ignore */ }
          }
          return { ...b, status, zip_url };
        })
      );

      return Response.json({ bundles: bundlesWithUrls });
    }

    // ── Latest Assessment ────────────────────────────────────────────────────
    if (type === 'assessment') {
      const { data: assessment } = await supabaseAdmin
        .from('assessments')
        .select('id, score, risk_class, grade, completed, imported_from_kicheck, created_at, updated_at')
        .eq('user_id', auth.user.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return Response.json({ assessment: assessment ?? null });
    }

    // ── Individual Documents in a Bundle ─────────────────────────────────────
    let query = supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (bundleId) query = query.eq('bundle_id', bundleId);

    const { data: documents, error } = await query;
    if (error) return E.internal();

    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc: Record<string, unknown>) => {
        let signed_url: string | null = null;
        if (doc.storage_path) {
          try { signed_url = await getSignedUrl(doc.storage_path as string); } catch { /* ignore */ }
        }
        return { ...doc, signed_url };
      })
    );

    return Response.json({ documents: docsWithUrls });

  } catch (e) {
    console.error('[/api/documents]', e);
    return E.internal();
  }
}

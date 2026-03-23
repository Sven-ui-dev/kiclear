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
      const bundlesWithUrls = await Promise.all(
        (bundles ?? []).map(async (b: Record<string, unknown>) => {
          let zip_url = b.zip_url as string | null;
          if (b.status === 'ready' && b.zip_path && !zip_url) {
            try { zip_url = await getSignedUrl(b.zip_path as string); } catch { /* ignore */ }
          }
          return { ...b, zip_url };
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

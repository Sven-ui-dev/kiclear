// GET /api/documents – Alle Dokumente des Nutzers abrufen
import { NextRequest } from 'next/server';
import { E, requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { searchParams } = new URL(req.url);
  const bundleId = searchParams.get('bundle_id');

  try {
    let query = supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (bundleId) query = query.eq('bundle_id', bundleId);

    const { data: documents, error } = await query;
    if (error) return E.internal();

    // Attach fresh signed URLs
    const docsWithUrls = await Promise.all(
      (documents ?? []).map(async (doc: Record<string, unknown>) => {
        let signed_url: string | null = null;
        if (doc.storage_path) {
          try { signed_url = await getSignedUrl(doc.storage_path as string); }
          catch { /* ignore */ }
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

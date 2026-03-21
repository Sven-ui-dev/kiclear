// GET /api/documents/:id          – Einzelnes Dokument
// GET /api/documents/:id/versions – Alle Versionen (Audit-Trail)
import { NextRequest } from 'next/server';
import { E, requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getSignedUrl } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const isVersions = req.nextUrl.pathname.endsWith('/versions');

  try {
    if (isVersions) {
      // Return all versions of this document type for audit trail
      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('doc_type, assessment_id')
        .eq('id', params.id)
        .eq('user_id', auth.user.id)
        .single();

      if (!doc) return E.notFound('Dokument');

      const { data: versions } = await supabaseAdmin
        .from('documents')
        .select('id, version, status, update_reason, law_reference, generated_at, created_at')
        .eq('user_id', auth.user.id)
        .eq('doc_type', doc.doc_type)
        .eq('assessment_id', doc.assessment_id)
        .order('version', { ascending: false });

      return Response.json({ versions: versions ?? [] });
    }

    // Single document
    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', auth.user.id)
      .single();

    if (!document) return E.notFound('Dokument');

    let signed_url: string | null = null;
    if (document.storage_path) {
      try { signed_url = await getSignedUrl(document.storage_path); }
      catch { /* ignore */ }
    }

    return Response.json({ ...document, signed_url });
  } catch (e) {
    console.error('[/api/documents/:id]', e);
    return E.internal();
  }
}

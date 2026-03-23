export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data: subs }       = await supabaseAdmin.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: assessments } = await supabaseAdmin.from('assessments').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: bundles }     = await supabaseAdmin.from('document_bundles').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: documents }   = await supabaseAdmin.from('documents').select('id, bundle_id, doc_type, created_at').order('created_at', { ascending: false }).limit(10);

  return Response.json({
    subscriptions:    subs    ?? [],
    assessments:      assessments ?? [],
    document_bundles: bundles  ?? [],
    documents:        documents ?? [],
  });
}

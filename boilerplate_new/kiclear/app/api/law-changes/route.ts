// GET /api/law-changes – Gesetzesänderungen abrufen
import { NextRequest } from 'next/server';
import { E, requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') ?? '10');

  const { data: changes } = await supabaseAdmin
    .from('law_changes')
    .select('id, title, summary, affects_betreiber, affects_anbieter, affected_doc_types, law_reference, published_at, created_at')
    .order('published_at', { ascending: false })
    .limit(limit);

  return Response.json({ law_changes: changes ?? [] });
}

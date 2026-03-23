export const dynamic = 'force-dynamic';
// build: 2026-03-23-debug
// GET /api/debug-subscription – zeigt ALLE subscriptions in der DB
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // Alle Subscriptions (Admin bypass RLS)
  const { data: allSubs, error: e1 } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  // Alle User-IDs die Subscriptions haben
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, company_name, created_at')
    .limit(10);

  return Response.json({
    subscriptions_count: allSubs?.length ?? 0,
    subscriptions:       allSubs ?? [],
    error:               e1?.message ?? null,
    profiles:            profiles ?? [],
  });
}

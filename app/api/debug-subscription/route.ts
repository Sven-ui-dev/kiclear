export const dynamic = 'force-dynamic';
// build: 2026-03-23-debug
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // Direkt eine Test-Subscription schreiben
  const testUserId = 'f15f319a-29c0-4be9-a254-267f9fc980a8'; // dein User

  const { data: writeTest, error: writeError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id:                testUserId,
      stripe_subscription_id: 'sub_debug_test',
      stripe_customer_id:     'cus_debug_test',
      tier:                   'starter',
      status:                 'active',
      current_period_start:   new Date().toISOString(),
      current_period_end:     new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      cancel_at_period_end:   false,
    }, { onConflict: 'stripe_subscription_id' });

  // Dann lesen
  const { data: allSubs, error: readError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  return Response.json({
    write_test: { ok: !writeError, error: writeError?.message ?? null },
    subscriptions_count: allSubs?.length ?? 0,
    subscriptions: allSubs ?? [],
    read_error: readError?.message ?? null,
  });
}

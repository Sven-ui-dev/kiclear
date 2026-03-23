export const dynamic = 'force-dynamic';
import { supabaseAdmin } from '@/lib/supabase';

const KNOWN_USERS = [
  'f15f319a-29c0-4be9-a254-267f9fc980a8',
  '22256ab4-8374-45c3-bbac-9d714b41ee07',
];

export async function POST() {
  const results: Record<string, unknown> = {};

  for (const userId of KNOWN_USERS) {
    await supabaseAdmin.from('assessments').delete().eq('user_id', userId);

    const { data: assessment, error: aErr } = await supabaseAdmin
      .from('assessments')
      .insert({
        user_id:               userId,
        answers:               { A1: 'yes', A2: 'DE', A3: 'DE', B1: 'yes', B2: 'no', C1: 'yes', D1: 'no', E1: 'yes' },
        score:                 65,
        risk_class:            'BEGRENZT',
        grade:                 'GELB',
        completed:             true,
        imported_from_kicheck: false,
      })
      .select().single();

    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions').select('id').eq('user_id', userId).maybeSingle();

    if (!existingSub) {
      await supabaseAdmin.from('subscriptions').insert({
        user_id:                userId,
        stripe_subscription_id: `sub_debug_${userId.slice(0,8)}`,
        stripe_customer_id:     `cus_debug_${userId.slice(0,8)}`,
        tier:                   'starter',
        status:                 'active',
        current_period_start:   new Date().toISOString(),
        current_period_end:     new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        cancel_at_period_end:   false,
      });
    }

    results[userId] = aErr ? { error: aErr.message } : { assessment_id: assessment?.id, score: 65 };
  }

  return Response.json({ ok: true, results });
}

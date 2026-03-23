// POST /api/subscription/portal – Stripe Kundenportal öffnen
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { E, requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { createPortalSession } from '@/lib/stripe';

export async function POST(_req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .single();

  if (!sub?.stripe_customer_id) return E.noSubscription();

  const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiclear.ai';

  try {
    const portalUrl = await createPortalSession(
      sub.stripe_customer_id,
      `${APP}/dashboard/settings`
    );
    return Response.json({ portal_url: portalUrl });
  } catch (e) {
    console.error('[/api/subscription/portal]', e);
    return E.internal('Kundenportal konnte nicht geöffnet werden.');
  }
}

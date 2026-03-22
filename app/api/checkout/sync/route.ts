// build: 2026-03-22
// GET /api/checkout/sync?session_id=cs_xxx
// Fallback falls Stripe-Webhook nicht konfiguriert ist.
// Holt Subscription direkt aus Stripe nach erfolgreichem Checkout.
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return Response.json({ error: 'session_id fehlt' }, { status: 400 });

  try {
    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.mode !== 'subscription') {
      return Response.json({ error: 'Keine Subscription-Session' }, { status: 400 });
    }

    // Sicherheit: Session gehört zu diesem User
    if (session.metadata?.user_id !== auth.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sub = session.subscription as unknown as {
      id: string; status: string;
      current_period_start: number; current_period_end: number;
      cancel_at_period_end: boolean;
    };

    await supabaseAdmin.from('subscriptions').upsert({
      user_id:                auth.user.id,
      stripe_subscription_id: sub.id,
      stripe_customer_id:     session.customer as string,
      tier:                   session.metadata?.tier ?? 'starter',
      status:                 sub.status,
      current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end:   sub.cancel_at_period_end,
    }, { onConflict: 'stripe_subscription_id' });

    // kicheck Transfer-Token
    const transferToken = session.metadata?.transfer_token;
    if (transferToken) {
      const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';
      try {
        const res = await fetch(`${KICHECK_URL}/api/check/session-from-token/${transferToken}`, {
          headers: { 'x-transfer-secret': process.env.KICHECK_TRANSFER_SECRET ?? '' },
        });
        if (res.ok) {
          const { answers_json, score, risk_class } = await res.json();
          await supabaseAdmin.from('assessments').insert({
            user_id: auth.user.id, answers: answers_json,
            score, risk_class, completed: true,
            imported_from_kicheck: true, kicheck_session_id: transferToken,
          });
        }
      } catch { /* ignore */ }
    }

    return Response.json({ ok: true, tier: session.metadata?.tier, status: sub.status });
  } catch (e) {
    console.error('[checkout/sync]', e);
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

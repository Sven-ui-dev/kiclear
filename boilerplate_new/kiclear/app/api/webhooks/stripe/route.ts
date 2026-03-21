// POST /api/webhooks/stripe – Stripe Webhook Handler
import { NextRequest } from 'next/server';
import { constructWebhookEvent } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (e) {
    console.error('[Stripe Webhook] Invalid signature:', e);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const userId         = session.metadata?.user_id;
        const tier           = session.metadata?.tier as string;
        const transferToken  = session.metadata?.transfer_token;
        const stripeSubId    = session.subscription as string;
        const stripeCustomer = session.customer as string;
        if (!userId || !stripeSubId) break;

        const { stripe } = await import('@/lib/stripe');
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const periodStart = new Date((stripeSub as unknown as { current_period_start: number }).current_period_start * 1000).toISOString();
        const periodEnd   = new Date((stripeSub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString();

        await supabaseAdmin.from('subscriptions').upsert({
          user_id:                userId,
          stripe_subscription_id: stripeSubId,
          stripe_customer_id:     stripeCustomer,
          tier,
          status:                 stripeSub.status,
          current_period_start:   periodStart,
          current_period_end:     periodEnd,
          cancel_at_period_end:   stripeSub.cancel_at_period_end,
        }, { onConflict: 'stripe_subscription_id' });

        if (transferToken) await importKicheckTransfer(userId, transferToken);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { getSubscriptionTier } = await import('@/lib/stripe');
        const tier = await getSubscriptionTier(sub.id);
        const raw = sub as unknown as { current_period_start: number; current_period_end: number };

        await supabaseAdmin
          .from('subscriptions')
          .update({
            status:               sub.status,
            tier:                 tier ?? undefined,
            current_period_start: new Date(raw.current_period_start * 1000).toISOString(),
            current_period_end:   new Date(raw.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            updated_at:           new Date().toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = (invoice as unknown as { subscription: string | null }).subscription;
        if (!stripeSubId) break;
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', stripeSubId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeSubId = (invoice as unknown as { subscription: string | null }).subscription;
        if (!stripeSubId) break;
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', stripeSubId);
        break;
      }
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error('[Stripe Webhook] Handler error:', e);
    return new Response('Handler error', { status: 500 });
  }
}

async function importKicheckTransfer(userId: string, token: string) {
  const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';
  try {
    const res = await fetch(`${KICHECK_URL}/api/check/session-from-token/${token}`, {
      headers: { 'x-transfer-secret': process.env.KICHECK_TRANSFER_SECRET ?? '' },
    });
    if (!res.ok) return;
    const { answers_json, score, risk_class } = await res.json();
    await supabaseAdmin.from('assessments').insert({
      user_id: userId, answers: answers_json, score, risk_class,
      completed: true, imported_from_kicheck: true, kicheck_session_id: token,
    });
  } catch (e) {
    console.error('[importKicheckTransfer]', e);
  }
}

export const dynamic = 'force-dynamic';
// build: 2026-03-23-v31
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import type Stripe from 'stripe';

function tsToIso(ts: unknown): string {
  const n = Number(ts);
  if (!n || isNaN(n)) throw new Error(`Invalid timestamp: ${ts}`);
  return new Date(n * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';

  console.log('[Webhook] Received, sig length:', signature.length, 'secret set:', !!webhookSecret);

  // Ohne STRIPE_WEBHOOK_SECRET: Event direkt parsen (nur für Development)
  let event: Stripe.Event;

  if (!webhookSecret) {
    // Kein Secret konfiguriert → Event direkt aus Body parsen (unsicher aber funktional zum Testen)
    console.log('[Webhook] WARNING: No STRIPE_WEBHOOK_SECRET set, skipping signature validation');
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }
  } else {
    // Mit Secret: Signatur validieren
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[Webhook] Signature validation failed:', msg);
      console.error('[Webhook] Secret prefix:', webhookSecret.slice(0, 10));
      // Wichtig: trotzdem 200 zurückgeben damit Stripe nicht retried
      // aber nichts in DB schreiben
      return Response.json({ error: 'Invalid signature', detail: msg }, { status: 400 });
    }
  }

  console.log('[Webhook] Event type:', event.type, '| ID:', event.id);

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[Webhook] checkout.session metadata:', JSON.stringify(session.metadata));
        console.log('[Webhook] checkout.session mode:', session.mode);
        console.log('[Webhook] checkout.session subscription:', session.subscription);

        if (session.mode !== 'subscription') {
          console.log('[Webhook] Not a subscription session, skipping');
          break;
        }

        const userId        = session.metadata?.user_id;
        const tier          = session.metadata?.tier ?? 'starter';
        const transferToken = session.metadata?.transfer_token;
        const stripeSubId   = session.subscription as string;
        const stripeCustomer = session.customer as string;

        if (!userId) {
          console.error('[Webhook] MISSING user_id in metadata! Cannot save subscription.');
          break;
        }
        if (!stripeSubId) {
          console.error('[Webhook] MISSING subscription ID!');
          break;
        }

        console.log('[Webhook] Retrieving subscription:', stripeSubId);
        const stripe    = getStripe();
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        const sub       = stripeSub as unknown as {
          status: string;
          current_period_start: number;
          current_period_end: number;
          cancel_at_period_end: boolean;
        };

        console.log('[Webhook] Sub status:', sub.status, 'period_start:', sub.current_period_start);

        const { error: dbError } = await supabaseAdmin.from('subscriptions').upsert({
          user_id:                userId,
          stripe_subscription_id: stripeSubId,
          stripe_customer_id:     stripeCustomer,
          tier,
          status:                 sub.status,
          current_period_start:   tsToIso(sub.current_period_start),
          current_period_end:     tsToIso(sub.current_period_end),
          cancel_at_period_end:   sub.cancel_at_period_end,
        }, { onConflict: 'stripe_subscription_id' });

        if (dbError) {
          console.error('[Webhook] DB upsert error:', dbError.message);
        } else {
          console.log('[Webhook] ✓ Subscription saved for user:', userId, 'tier:', tier);
        }

        if (transferToken) {
          console.log('[Webhook] Processing transfer token:', transferToken);
          await importKicheckTransfer(userId, transferToken);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as {
          id: string; status: string;
          current_period_start: number; current_period_end: number;
          cancel_at_period_end: boolean;
          items: { data: Array<{ price: { id: string } }> };
        };
        const priceId = sub.items?.data[0]?.price?.id;
        const { getTierFromPriceId } = await import('@/config/pricing');
        const tier = priceId ? getTierFromPriceId(priceId) : undefined;

        const { error } = await supabaseAdmin.from('subscriptions').update({
          status: sub.status,
          ...(tier ? { tier } : {}),
          current_period_start: tsToIso(sub.current_period_start),
          current_period_end:   tsToIso(sub.current_period_end),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at:           new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);

        console.log('[Webhook] subscription.updated:', sub.id, error?.message ?? '✓');
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        console.log('[Webhook] subscription.deleted:', sub.id);
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as unknown as { subscription: string | null };
        if (inv.subscription) {
          await supabaseAdmin.from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', inv.subscription);
          console.log('[Webhook] payment_succeeded:', inv.subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as unknown as { subscription: string | null };
        if (inv.subscription) {
          await supabaseAdmin.from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', inv.subscription);
          console.log('[Webhook] payment_failed:', inv.subscription);
        }
        break;
      }

      default:
        console.log('[Webhook] Unhandled event:', event.type);
    }

    return Response.json({ received: true });
  } catch (e) {
    console.error('[Webhook] Handler error:', e);
    return new Response('Handler error', { status: 500 });
  }
}

async function importKicheckTransfer(userId: string, token: string) {
  const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';
  const secret      = process.env.KICHECK_TRANSFER_SECRET ?? '';

  console.log('[Transfer] URL:', KICHECK_URL);
  console.log('[Transfer] Secret set:', !!secret, 'length:', secret.length);
  console.log('[Transfer] Token:', token);

  if (!secret) {
    console.error('[Transfer] KICHECK_TRANSFER_SECRET not set!');
    return;
  }

  try {
    const url = `${KICHECK_URL}/api/check/session-from-token/${token}`;
    console.log('[Transfer] Calling:', url);

    const res = await fetch(url, {
      headers: { 'x-transfer-secret': secret },
    });

    const body = await res.text();
    console.log('[Transfer] Response status:', res.status);
    console.log('[Transfer] Response body:', body.slice(0, 200));

    if (!res.ok) {
      console.error('[Transfer] Failed:', res.status, body);
      return;
    }

    const data = JSON.parse(body);
    const { answers_json, score, risk_class } = data;

    if (!answers_json) {
      console.error('[Transfer] No answers_json in response:', data);
      return;
    }

    const { error: dbErr } = await supabaseAdmin.from('assessments').insert({
      user_id:               userId,
      answers:               answers_json,
      score,
      risk_class,
      completed:             true,
      imported_from_kicheck: true,
      kicheck_session_id:    token,
    });

    if (dbErr) {
      console.error('[Transfer] DB insert error:', dbErr.message);
    } else {
      console.log('[Transfer] ✓ Assessment imported for user:', userId);
    }
  } catch (e) {
    console.error('[Transfer] Exception:', e);
  }
}

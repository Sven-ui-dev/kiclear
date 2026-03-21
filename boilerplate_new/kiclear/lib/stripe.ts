import Stripe from 'stripe';
import type { SubscriptionTier } from '@/types';
import { TIER_MAP, getTierFromPriceId } from '@/config/pricing';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as never,
});

// ── Create checkout session ───────────────────────────────────────────────────
export async function createCheckoutSession(params: {
  userId:      string;
  email:       string;
  tier:        SubscriptionTier;
  transferToken?: string | null; // from kicheck.ai
  successUrl:  string;
  cancelUrl:   string;
}): Promise<string> {
  const tierConfig = TIER_MAP[params.tier];
  if (!tierConfig?.priceId) throw new Error(`No price ID for tier: ${params.tier}`);

  const session = await stripe.checkout.sessions.create({
    mode:               'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    customer_email:     params.email,
    line_items: [{ price: tierConfig.priceId, quantity: 1 }],
    metadata: {
      user_id:        params.userId,
      tier:           params.tier,
      transfer_token: params.transferToken ?? '',
    },
    subscription_data: {
      metadata: { user_id: params.userId, tier: params.tier },
    },
    success_url: params.successUrl,
    cancel_url:  params.cancelUrl,
    locale:      'de',
    allow_promotion_codes: true,
  });

  return session.url!;
}

// ── Create portal session ─────────────────────────────────────────────────────
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ── Parse webhook ─────────────────────────────────────────────────────────────
export function constructWebhookEvent(body: string, signature: string): Stripe.Event {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

// ── Get tier from subscription ────────────────────────────────────────────────
export async function getSubscriptionTier(
  stripeSubscriptionId: string
): Promise<SubscriptionTier | null> {
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const priceId = sub.items.data[0]?.price.id;
  return priceId ? getTierFromPriceId(priceId) : null;
}

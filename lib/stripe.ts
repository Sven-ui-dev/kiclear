import Stripe from 'stripe';
import type { SubscriptionTier } from '@/types';
import { TIER_MAP, getTierFromPriceId } from '@/config/pricing';

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20' as never,
    });
  }
  return stripeInstance;
}

// Re-export all Stripe functions
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (...args: any[]) => (getStripe() as any)[prop](...args);
  }
});

// Export getStripe for internal use
export { getStripe };

// ── Create checkout session ───────────────────────────────────────────────────
export async function createCheckoutSession(params: {
  userId:      string;
  email:       string;
  tier:        SubscriptionTier;
  transferToken?: string | null;
  successUrl:  string;
  cancelUrl:   string;
}): Promise<string> {
  const tierConfig = TIER_MAP[params.tier];
  if (!tierConfig?.priceId) throw new Error(`No price ID for tier: ${params.tier}`);

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card', 'sepa_debit'],
    line_items: [{ price: tierConfig.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      user_id: params.userId,
      tier: params.tier,
      transfer_token: params.transferToken ?? '',
    },
    customer_email: params.email,
    subscription_data: {
      metadata: { user_id: params.userId },
    },
  });

  if (!session.url) throw new Error('No checkout URL created');
  return session.url;
}

// ── Create portal session ─────────────────────────────────────────────────────
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
  return session.url;
}

// ── Construct webhook event ───────────────────────────────────────────────────
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

// ── Retrieve subscription ───────────────────────────────────────────────────
export async function retrieveSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  const sub = await getStripe().subscriptions.retrieve(stripeSubscriptionId);
  return sub;
}

// ── Get tier from price ID ─────────────────────────────────────────────────
export function getTierFromSubscription(sub: Stripe.Subscription): SubscriptionTier {
  const priceId = sub.items.data[0]?.price.id;
  if (!priceId) return 'business';
  return getTierFromPriceId(priceId) ?? 'business';
}

// POST /api/subscription/checkout – Stripe Checkout starten
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody, E, requireAuth } from '@/lib/api-helpers';
import { createCheckoutSession } from '@/lib/stripe';

const schema = z.object({
  tier:           z.enum(['starter', 'business', 'pro']),
  transfer_token: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiclear.ai';

  // Frühzeitige Validierung: priceId vorhanden?
  const { TIER_MAP } = await import('@/config/pricing');
  const tierConfig = (TIER_MAP as Record<string, { priceId?: string }>)[data.tier];
  if (!tierConfig?.priceId) {
    console.error('[checkout] Missing priceId for tier:', data.tier, 'tierConfig:', tierConfig);
    return Response.json({
      error: { code: 'MISSING_PRICE_ID', message: `Keine Price-ID für Tier "${data.tier}" konfiguriert. STRIPE_PRICE_${data.tier.toUpperCase()} in Vercel prüfen.` }
    }, { status: 500 });
  }
  console.log('[checkout] Using priceId:', tierConfig.priceId, 'for tier:', data.tier);

  try {
    const checkoutUrl = await createCheckoutSession({
      userId:        auth.user.id,
      email:         auth.user.email,
      tier:          data.tier,
      transferToken: data.transfer_token,
      successUrl:    `${APP}/api/checkout/complete?session_id={CHECKOUT_SESSION_ID}&tier=${data.tier}`,
      cancelUrl:     `${APP}/checkout?canceled=true`,
    });

    return Response.json({ checkout_url: checkoutUrl });
  } catch (e) {
    // Stripe-Fehler im Detail loggen UND an den Client schicken (für Debugging)
    const stripeMsg = e instanceof Error ? e.message : String(e);
    const stripeType = (e as Record<string, unknown>)?.type as string ?? '';
    const stripeCode = (e as Record<string, unknown>)?.code as string ?? '';

    console.error('[/api/subscription/checkout] Stripe error:', {
      message: stripeMsg,
      type:    stripeType,
      code:    stripeCode,
      tier:    data.tier,
      userId:  auth.user.id,
    });

    // Im Development oder für besseres Debugging: echten Fehler zurückgeben
    return Response.json({
      error: {
        code:    'STRIPE_ERROR',
        message: stripeMsg,
        type:    stripeType,
        stripe_code: stripeCode,
      }
    }, { status: 500 });
  }
}

// POST /api/subscription/checkout – Stripe Checkout starten
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseBody, E, requireAuth } from '@/lib/api-helpers';
import { createCheckoutSession } from '@/lib/stripe';

const schema = z.object({
  tier:           z.enum(['starter', 'business', 'pro']),
  transfer_token: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { data, error } = await parseBody(req, schema);
  if (error) return error;

  const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiclear.ai';

  try {
    const checkoutUrl = await createCheckoutSession({
      userId:        auth.user.id,
      email:         auth.user.email,
      tier:          data.tier,
      transferToken: data.transfer_token,
      successUrl:    `${APP}/dashboard?checkout=success&tier=${data.tier}`,
      cancelUrl:     `${APP}/checkout?canceled=true`,
    });

    return Response.json({ checkout_url: checkoutUrl });
  } catch (e) {
    console.error('[/api/subscription/checkout]', e);
    return E.internal('Checkout-Session konnte nicht erstellt werden.');
  }
}

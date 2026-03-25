// build: 2026-03-22-v25
// GET /api/checkout/complete?session_id=cs_xxx&tier=xxx
// Stripe redirectet hierher nach erfolgreichem Checkout.
// Kein Auth-Check nötig – user_id kommt aus Stripe-Metadaten (tamper-proof).
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  const tier      = searchParams.get('tier') ?? 'starter';

  if (!sessionId) {
    return NextResponse.redirect(new URL('/dashboard?checkout=error&reason=no_session_id', origin));
  }

  try {
    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.mode !== 'subscription' || !session.subscription) {
      return NextResponse.redirect(new URL('/dashboard?checkout=error&reason=not_subscription', origin));
    }

    // user_id aus Stripe-Metadaten – wurde beim Checkout-Erstellen gesetzt
    // Stripe-Metadaten sind server-seitig gesetzt → nicht manipulierbar
    const userId = session.metadata?.user_id;
    if (!userId) {
      console.error('[checkout/complete] No user_id in session metadata:', sessionId);
      return NextResponse.redirect(new URL('/dashboard?checkout=error&reason=no_user_id', origin));
    }

    // subscription kann String (ID) oder erweitertes Objekt sein
    let subObj: { id: string; status: string; current_period_start?: number; current_period_end?: number; cancel_at_period_end?: boolean };

    if (typeof session.subscription === 'string') {
      // Expand hat nicht funktioniert → Subscription separat abrufen
      const stripe = getStripe();
      const fetched = await stripe.subscriptions.retrieve(session.subscription) as unknown as Stripe.Subscription;
      subObj = {
        id:                   fetched.id,
        status:               fetched.status,
        current_period_start: fetched.current_period_start,
        current_period_end:   fetched.current_period_end,
        cancel_at_period_end: fetched.cancel_at_period_end,
      };
    } else {
      const s = session.subscription as { id: string; status: string; current_period_start?: number; current_period_end?: number; cancel_at_period_end?: boolean };
      subObj = s;
    }

    const now      = Date.now();
    const periodStart = subObj.current_period_start
      ? new Date(subObj.current_period_start * 1000).toISOString()
      : new Date(now).toISOString();
    const periodEnd = subObj.current_period_end
      ? new Date(subObj.current_period_end * 1000).toISOString()
      : new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

    const actualTier = session.metadata?.tier ?? tier;

    // Subscription in DB schreiben (kein Auth nötig – supabaseAdmin bypassed RLS)
    const { error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id:                userId,
        stripe_subscription_id: subObj.id,
        stripe_customer_id:     session.customer as string,
        tier:                   actualTier,
        status:                 subObj.status,
        current_period_start:   periodStart,
        current_period_end:     periodEnd,
        cancel_at_period_end:   subObj.cancel_at_period_end ?? false,
      }, { onConflict: 'stripe_subscription_id' });

    if (dbError) {
      console.error('[checkout/complete] DB error:', dbError.message);
      return NextResponse.redirect(
        new URL(`/dashboard?checkout=error&reason=${encodeURIComponent(dbError.message)}`, origin)
      );
    }

    console.log('[checkout/complete] ✓ Subscription gespeichert:', {
      userId, tier: actualTier, subId: sub.id, status: sub.status
    });

    // kicheck Transfer-Token verarbeiten
    const transferToken = session.metadata?.transfer_token;
    if (transferToken) {
      try {
        const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';
        const res = await fetch(
          `${KICHECK_URL}/api/check/session-from-token/${transferToken}`,
          { headers: { 'x-transfer-secret': process.env.KICHECK_TRANSFER_SECRET ?? '' } }
        );
        if (res.ok) {
          const { answers_json, score, risk_class } = await res.json();
          await supabaseAdmin.from('assessments').insert({
            user_id:               userId,
            answers:               answers_json,
            score,
            risk_class,
            completed:             true,
            imported_from_kicheck: true,
            kicheck_session_id:    transferToken,
          });
          console.log('[checkout/complete] ✓ kicheck Assessment importiert');
        }
      } catch (e) {
        console.error('[checkout/complete] kicheck import error:', e);
      }
    }

    // Erfolg → Dashboard
    return NextResponse.redirect(
      new URL(`/dashboard?checkout=success&tier=${actualTier}`, origin)
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[checkout/complete] Error:', msg);
    return NextResponse.redirect(
      new URL(`/dashboard?checkout=error&reason=${encodeURIComponent(msg)}`, origin)
    );
  }
}

// build: 2026-03-22
// GET /api/checkout/complete?session_id=cs_xxx&tier=xxx
// Stripe redirectet hierher nach erfolgreichem Checkout.
// Diese Route synct die Subscription und redirectet dann zum Dashboard.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  const tier      = searchParams.get('tier') ?? 'starter';

  if (!sessionId) {
    return NextResponse.redirect(new URL('/dashboard?checkout=error&reason=no_session', origin));
  }

  // Auth prüfen
  const cookieStore = cookies();
  const supabase    = createSupabaseServer(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Nicht eingeloggt – zum Login mit Redirect zurück
    const dest = `/auth/login?redirect=${encodeURIComponent(`/api/checkout/complete?session_id=${sessionId}&tier=${tier}`)}`;
    return NextResponse.redirect(new URL(dest, origin));
  }

  try {
    const stripe  = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.mode !== 'subscription' || !session.subscription) {
      return NextResponse.redirect(new URL('/dashboard?checkout=error&reason=invalid_session', origin));
    }

    // Sicherheit: user_id aus Metadata muss übereinstimmen
    const metaUserId = session.metadata?.user_id;
    if (metaUserId && metaUserId !== user.id) {
      return NextResponse.redirect(new URL('/dashboard?checkout=error&reason=user_mismatch', origin));
    }

    const sub = session.subscription as unknown as {
      id: string; status: string;
      current_period_start: number; current_period_end: number;
      cancel_at_period_end: boolean;
    };

    // Subscription in DB schreiben
    const { error: dbError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id:                user.id,
        stripe_subscription_id: sub.id,
        stripe_customer_id:     session.customer as string,
        tier:                   session.metadata?.tier ?? tier,
        status:                 sub.status,
        current_period_start:   new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end:   sub.cancel_at_period_end,
      }, { onConflict: 'stripe_subscription_id' });

    if (dbError) {
      console.error('[checkout/complete] DB upsert error:', dbError);
      return NextResponse.redirect(new URL(`/dashboard?checkout=error&reason=db_error`, origin));
    }

    console.log('[checkout/complete] Success for user:', user.id, 'tier:', tier);

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
            user_id: user.id, answers: answers_json,
            score, risk_class, completed: true,
            imported_from_kicheck: true, kicheck_session_id: transferToken,
          });
        }
      } catch { /* ignore */ }
    }

    // Erfolg: zum Dashboard redirecten
    return NextResponse.redirect(
      new URL(`/dashboard?checkout=success&tier=${tier}`, origin)
    );

  } catch (e) {
    console.error('[checkout/complete] Error:', e);
    const msg = encodeURIComponent(e instanceof Error ? e.message : 'unknown');
    return NextResponse.redirect(new URL(`/dashboard?checkout=error&reason=${msg}`, origin));
  }
}

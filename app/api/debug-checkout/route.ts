// build: 2026-03-22
// TEMPORÄRER DEBUG-ENDPOINT - nach dem Fix entfernen!
// GET /api/debug-checkout – prüft jeden Schritt des Checkout-Flows
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase';

export async function GET() {
  const steps: Record<string, unknown> = {};

  // 1. Env-Vars
  steps.env = {
    NEXT_PUBLIC_SUPABASE_URL:    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON:   !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY:           !!process.env.STRIPE_SECRET_KEY,
    STRIPE_SECRET_KEY_prefix:    (process.env.STRIPE_SECRET_KEY || '').slice(0, 8) || 'MISSING',
    STRIPE_PRICE_STARTER:        process.env.STRIPE_PRICE_STARTER || 'MISSING',
    STRIPE_PRICE_BUSINESS:       process.env.STRIPE_PRICE_BUSINESS || 'MISSING',
    STRIPE_PRICE_PRO:            process.env.STRIPE_PRICE_PRO || 'MISSING',
    NEXT_PUBLIC_APP_URL:         process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
  };

  // 2. Auth
  try {
    const cookieStore = cookies();
    const allCookies = cookieStore.getAll();
    steps.cookies_count = allCookies.length;
    steps.supabase_cookies = allCookies
      .filter(c => c.name.startsWith('sb-'))
      .map(c => ({ name: c.name, length: c.value.length }));

    const supabase = createSupabaseServer(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    steps.auth = {
      ok:      !!user && !authError,
      user_id: user ? user.id.slice(0, 8) + '...' : null,
      email:   user ? user.email : null,
      error:   authError?.message ?? null,
    };
  } catch (e) {
    steps.auth = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Stripe-Verbindung testen
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20' as never,
    });
    const account = await stripe.accounts.retrieve();
    steps.stripe = {
      ok:           true,
      account_id:   account.id,
      country:      account.country,
    };
  } catch (e) {
    steps.stripe = {
      ok:    false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 4. Price IDs validieren
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20' as never,
    });

    const priceIds = {
      starter:  process.env.STRIPE_PRICE_STARTER  ?? '',
      business: process.env.STRIPE_PRICE_BUSINESS ?? '',
      pro:      process.env.STRIPE_PRICE_PRO      ?? '',
    };

    const priceChecks: Record<string, unknown> = {};
    for (const [tier, priceId] of Object.entries(priceIds)) {
      if (!priceId) {
        priceChecks[tier] = { ok: false, error: 'Env-Var nicht gesetzt' };
        continue;
      }
      try {
        const price = await stripe.prices.retrieve(priceId);
        priceChecks[tier] = {
          ok:        true,
          id:        price.id,
          amount:    price.unit_amount,
          currency:  price.currency,
          recurring: price.recurring?.interval ?? null,
          active:    price.active,
        };
      } catch (e) {
        priceChecks[tier] = {
          ok:    false,
          id:    priceId,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }
    steps.prices = priceChecks;
  } catch (e) {
    steps.prices = { error: e instanceof Error ? e.message : String(e) };
  }

  // Gesamtstatus
  const authOk   = (steps.auth as Record<string, unknown>)?.ok === true;
  const stripeOk = (steps.stripe as Record<string, unknown>)?.ok === true;
  const prices   = steps.prices as Record<string, Record<string, unknown>>;
  const pricesOk = prices && Object.values(prices).every(p => p?.ok === true);

  return Response.json({
    status: authOk && stripeOk && pricesOk ? 'OK – Checkout sollte funktionieren' : 'FEHLER – Details unten',
    steps,
  }, { status: 200 });
}

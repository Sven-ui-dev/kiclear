'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TIERS } from '@/config/pricing';
import type { SubscriptionTier } from '@/types';

export default function CheckoutPage() {
  const router       = useRouter();
  const params       = useSearchParams();
  const [tier, setTier]     = useState<SubscriptionTier>((params.get('tier') as SubscriptionTier) ?? 'business');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const transferToken = params.get('transfer');
  const autostart     = params.get('autostart') === '1';

  // Auto-trigger nach Redirect von Login/Register
  useEffect(() => {
    if (!autostart) return;
    // Kurze Wartezeit damit setSession() aus Login-Page propagiert
    const t = setTimeout(() => handleCheckout(), 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autostart]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) return { 'Authorization': `Bearer ${session.access_token}` };
    } catch { /* ignore */ }
    return {};
  };

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, transfer_token: transferToken }),
      });

      if (res.status === 401) {
        if (autostart) {
          // autostart aber 401: Session noch nicht bereit, nochmal versuchen
          setLoading(false);
          setError('Session noch nicht bereit – bitte Button klicken.');
          return;
        }
        // Manueller Klick, nicht eingeloggt → zu Register
        const redirectTarget = `/checkout?tier=${tier}${transferToken ? `&transfer=${transferToken}` : ''}`;
        window.location.href = `/auth/register?redirect=${encodeURIComponent(redirectTarget)}`;
        return;
      }

      if (!res.ok) {
        // API gibt { error: { code, message } } zurück (api-helpers.ts Format)
        let msg = `Serverfehler (${res.status})`;
        try {
          const d = await res.json();
          // Verschiedene Error-Shapes abfangen:
          // { error: { message: '...' } }  ← api-helpers Format
          // { error: '...' }               ← einfacher String
          // { message: '...' }             ← direktes message-Feld
          if (typeof d?.error === 'object' && d.error?.message) {
            msg = d.error.message;
          } else if (typeof d?.error === 'string') {
            msg = d.error;
          } else if (typeof d?.message === 'string') {
            msg = d.message;
          }
          console.error('[checkout] API error:', JSON.stringify(d));
        } catch { /* ignore parse error */ }
        throw new Error(msg);
      }

      const body = await res.json();
      console.log('[checkout] API response:', JSON.stringify(body));
      if (!body.checkout_url) throw new Error('Keine Checkout-URL erhalten – bitte Support kontaktieren.');
      window.location.href = body.checkout_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error('[checkout] Error:', msg);
      setError(msg);
      setLoading(false);
    }
  };

  const selectedTier = TIERS.find(t => t.id === tier);

  return (
    <main className="min-h-screen bg-bg bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <a href="/" className="font-mono text-white/40 hover:text-white/70 text-sm mb-10 block">
          ← ki<span className="text-brand-green">clear</span>.ai
        </a>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Nachweispaket bestellen
        </h1>
        {transferToken && (
          <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl px-4 py-2 mb-6 text-sm text-brand-green">
            ✓ Ihr kicheck.ai Assessment wird übernommen – kein Neustart nötig
          </div>
        )}

        {/* Tier selector */}
        <div className="flex flex-col gap-3 mb-6">
          {TIERS.map(t => (
            <button
              key={t.id}
              onClick={() => setTier(t.id)}
              className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                tier === t.id
                  ? 'border-brand-green bg-brand-green/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-white">{t.name}</span>
                  <span className="text-xs font-mono text-brand-green border border-brand-green/20 bg-brand-green/8 px-2 py-0.5 rounded ml-2">{t.targetGroup}</span>
                </div>
                <span className="font-mono font-bold text-white">€{t.price}/Mo.</span>
              </div>
              {tier === t.id && (
                <ul className="mt-3 flex flex-col gap-1">
                  {t.features.slice(0, 3).map(f => (
                    <li key={f} className="text-xs text-brand-green flex items-center gap-1">
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-bold text-base transition-all
            ${loading ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-brand-green text-bg hover:bg-green-300'}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
              Weiterleitung zu Stripe…
            </span>
          ) : `${selectedTier?.name} für €${selectedTier?.price}/Monat →`}
        </button>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-2
            text-red-400 text-sm flex items-start gap-2">
            <span className="shrink-0">⚠️</span>
            <div>
              <p className="font-semibold mb-0.5">Checkout fehlgeschlagen</p>
              <p className="text-red-400/80">{error}</p>
              {error.includes('price') || error.includes('Price') || error.includes('500') ? (
                <p className="text-red-400/60 text-xs mt-1">
                  Stripe Price IDs fehlen in der Konfiguration. Bitte{' '}
                  <a href="mailto:hallo@kiclear.ai" className="underline">Support kontaktieren</a>.
                </p>
              ) : null}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-white/25 mt-4">
          SEPA Lastschrift & Kreditkarte · Monatlich kündbar · Stripe Checkout
        </p>
      </div>
    </main>
  );
}

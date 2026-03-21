'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TIERS } from '@/config/pricing';
import type { SubscriptionTier } from '@/types';

function CheckoutContent() {
  const router       = useRouter();
  const params       = useSearchParams();
  const [tier, setTier]     = useState<SubscriptionTier>((params.get('tier') as SubscriptionTier) ?? 'business');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const transferToken = params.get('transfer');

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, transfer_token: transferToken }),
      });

      if (res.status === 401) {
        // Not logged in – go to register first
        router.push(`/auth/register?redirect=/checkout?tier=${tier}${transferToken ? `&transfer=${transferToken}` : ''}`);
        return;
      }

      if (!res.ok) throw new Error('Checkout-Fehler');

      const { checkout_url } = await res.json();
      window.location.href = checkout_url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
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

        {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

        <p className="text-center text-xs text-white/25 mt-4">
          SEPA Lastschrift & Kreditkarte · Monatlich kündbar · Stripe Checkout
        </p>
      </div>
    </main>
  );
}


export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-bg flex items-center justify-center'><span className='text-white/50'>Laden...</span></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

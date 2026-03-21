'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Bundle {
  id: string;
  version: number;
  status: string;
  docs_generated: number;
  docs_total: number;
  zip_url: string | null;
  zip_expires_at: string | null;
  generated_at: string;
  update_reason: string | null;
}

interface Subscription {
  tier: string;
  status: string;
  current_period_end: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [bundles, setBundles]   = useState<Bundle[]>([]);
  const [sub, setSub]           = useState<Subscription | null>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, docsRes] = await Promise.all([
        fetch('/api/subscription'),
        fetch('/api/documents'),
      ]);
      if (subRes.status === 401) { router.push('/auth/login'); return; }
      const { subscription }  = await subRes.json();
      const { documents }     = await docsRes.json();
      setSub(subscription);
      // Group into bundles (simplified)
      setBundles(documents?.slice(0, 5) ?? []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: 'latest' }), // simplified
      });
      if (!res.ok) throw new Error('Generierung fehlgeschlagen');
      await loadData();
    } catch { /* handle error */ }
    finally { setGenerating(false); }
  };

  const TIER_LABEL: Record<string, string> = {
    starter: 'Starter',
    business: 'Business',
    pro: 'Pro',
    enterprise: 'Enterprise',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-bg">
      {/* Header */}
      <header className="bg-bg border-b border-white/7 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-mono font-bold text-white">
            ki<span className="text-brand-green">clear</span>.ai
          </span>
          <div className="flex items-center gap-4">
            {sub && (
              <span className="text-xs font-mono text-brand-green border border-brand-green/30 bg-brand-green/10 px-3 py-1 rounded-full">
                {TIER_LABEL[sub.tier] ?? sub.tier}
              </span>
            )}
            <button
              onClick={() => fetch('/api/subscription/portal', { method: 'POST' }).then(r => r.json()).then(d => window.location.href = d.portal_url)}
              className="text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Abo verwalten
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome + Generate CTA */}
        <div className="bg-bg-card border border-white/7 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Ihr Compliance-Dashboard</h1>
            <p className="text-white/50 text-sm">
              {sub ? `Aktives ${TIER_LABEL[sub.tier]}-Abo · Verlängerung: ${new Date(sub.current_period_end).toLocaleDateString('de-DE')}` : 'Kein aktives Abo'}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || !sub}
            className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              generating || !sub
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-brand-green text-bg hover:bg-green-300'
            }`}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                Generiert…
              </span>
            ) : '+ Dokumente generieren'}
          </button>
        </div>

        {/* Document bundles */}
        <h2 className="text-lg font-bold text-white mb-4">Ihre Dokumente</h2>
        {bundles.length === 0 ? (
          <div className="bg-bg-card border border-white/7 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-white/50 mb-4">Noch keine Dokumente generiert.</p>
            <button
              onClick={handleGenerate}
              className="bg-brand-green text-bg font-bold px-6 py-3 rounded-xl hover:bg-green-300 transition-colors text-sm"
            >
              Jetzt generieren →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {bundles.map((bundle, i) => (
              <div key={bundle.id ?? i} className="bg-bg-card border border-white/7 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">Nachweispaket</span>
                    {bundle.update_reason && (
                      <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        {bundle.update_reason}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/40">
                    {bundle.docs_generated ?? '–'} Dokumente · Erstellt {bundle.generated_at ? new Date(bundle.generated_at).toLocaleDateString('de-DE') : '–'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {bundle.zip_url && (
                    <a
                      href={bundle.zip_url}
                      download
                      className="text-xs font-semibold text-brand-green border border-brand-green/30 bg-brand-green/10 px-3 py-1.5 rounded-lg hover:bg-brand-green/20 transition-colors"
                    >
                      ↓ ZIP Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

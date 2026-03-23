'use client'; // build: 2026-03-23-v35
// ────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Compliance Dashboard
// ────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AssessmentImport } from '@/components/dashboard/AssessmentImport';

interface Subscription {
  tier: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}
interface Bundle {
  id: string;
  version: number;
  status: 'pending' | 'generating' | 'ready' | 'error';
  docs_total: number;
  docs_done: number;
  zip_url: string | null;
  zip_expires_at: string | null;
  update_reason: string | null;
  law_reference: string | null;
  generation_completed_at: string | null;
}
interface Assessment {
  id: string;
  score: number | null;
  risk_class: string | null;
  grade: string | null;
  completed: boolean;
  imported_from_kicheck: boolean;
}

const TIER_LABEL: Record<string, string> = { starter: 'Starter', business: 'Business', pro: 'Pro', enterprise: 'Enterprise' };
const TIER_COLOR: Record<string, string> = {
  starter:    'text-blue-400 border-blue-400/30 bg-blue-400/10',
  business:   'text-brand-green border-brand-green/30 bg-brand-green/10',
  pro:        'text-purple-400 border-purple-400/30 bg-purple-400/10',
  enterprise: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
};
const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  GRUEN: { label: 'Konform',         color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20' },
  GELB:  { label: 'Handlungsbedarf', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20' },
  ROT:   { label: 'Dringend',        color: 'text-red-400',   bg: 'bg-red-400/10 border-red-400/20' },
};
const RISK_COLOR: Record<string, string> = {
  MINIMAL: 'text-green-400', BEGRENZT: 'text-amber-400', HOCHRISIKO: 'text-red-400', VERBOTEN: 'text-red-600',
};

export default function DashboardPage() {
  const router = useRouter();
  const [user,       setUser]       = useState<{ email: string } | null>(null);
  const [sub,        setSub]        = useState<Subscription | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [bundles,    setBundles]    = useState<Bundle[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError,   setGenError]   = useState('');
  const [polling,    setPolling]    = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const { getSupabaseBrowser } = await import('@/lib/supabase');
        const sb = getSupabaseBrowser();

        // getSession() liest aus localStorage (client-side)
        // getUser() macht einen Server-Call - nutze getSession für lokale Prüfung
        const { data: { session } } = await sb.auth.getSession();

        if (!session) {
          // Kein Client-Session → server-side check
          const { data: { user } } = await sb.auth.getUser();
          if (!user) { router.push('/auth/login'); return; }
          setUser({ email: user.email ?? '' });
        } else {
          setUser({ email: session.user.email ?? '' });
        }

        // Nach Stripe-Checkout: Subscription möglicherweise noch nicht in DB
        // (Webhook braucht 1-3 Sek.) → mit Retry pollen
        if (searchParams.get('checkout') === 'success') {
          // Retry-Loop: Webhook braucht 1-3 Sek. bis Subscription in DB
          const MAX = 8; const DELAY = 1500;
          for (let i = 0; i < MAX; i++) {
            await loadData();
            // Prüfe ob Subscription jetzt in State ist via API
            const check = await fetch('/api/subscription').then(r => r.json()).catch(() => ({}));
            if (check.subscription) {
              setSub(check.subscription);
              console.log('[dashboard] sub nach', i+1, 'Versuchen geladen');
              break;
            }
            if (i < MAX - 1) await new Promise(r => setTimeout(r, DELAY));
          }
        } else {
          loadData();
        }
      } catch {
        router.push('/auth/login');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!polling) return;
    const iv = setInterval(async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/documents?type=bundles', { headers });
      if (!res.ok) return;
      const { bundles: fresh } = await res.json();
      setBundles(fresh ?? []);
      const t = fresh?.find((b: Bundle) => b.id === polling);
      if (t?.status === 'ready' || t?.status === 'error') { setPolling(null); setGenerating(false); }
    }, 2500);
    return () => clearInterval(iv);
  }, [polling]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase');
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (session?.access_token) return { 'Authorization': `Bearer ${session.access_token}` };
    } catch { /* ignore */ }
    return {};
  };

  const loadData = async () => {
    try {
      const headers = await getAuthHeaders();
      const [s, b, a] = await Promise.all([
        fetch('/api/subscription',              { headers }),
        fetch('/api/documents?type=bundles',    { headers }),
        fetch('/api/documents?type=assessment', { headers }),
      ]);
      if (s.status === 401) { router.push('/auth/login'); return; }
      const sd = s.ok ? await s.json() : {};
      const bd = b.ok ? await b.json() : {};
      const ad = a.ok ? await a.json() : {};
      setSub(sd.subscription ?? null);
      setBundles(bd.bundles ?? []);
      setAssessment(ad.assessment ?? null);
    } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!assessment) return;
    setGenerating(true); setGenError('');
    try {
      const authHdr = await getAuthHeaders();
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { ...authHdr, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: assessment.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as Record<string,unknown>;
        const errObj = d?.error as Record<string,unknown> | undefined;
        throw new Error((errObj?.message as string) ?? (d?.message as string) ?? 'Fehler');
      }
      const { bundle_id } = await res.json();
      setPolling(bundle_id);
      await loadData();
    } catch (e) { setGenError(e instanceof Error ? e.message : 'Fehler'); setGenerating(false); }
  };

  const handleLogout = async () => {
    const { getSupabaseBrowser } = await import('@/lib/supabase');
    await getSupabaseBrowser().auth.signOut();
    router.push('/');
  };
  const handlePortal = async () => {
    const r = await fetch('/api/subscription/portal', { method: 'POST' });
    if (r.ok) { const { portal_url } = await r.json(); window.location.href = portal_url; }
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />
    </div>
  );

  const latestBundle = bundles[0] ?? null;
  const gradeConfig  = assessment?.grade ? GRADE_CONFIG[assessment.grade] : null;
  const isGenerating = generating || latestBundle?.status === 'generating';
  const canGenerate  = !!sub && sub.status === 'active' && !!assessment?.completed && !isGenerating;
  const daysLeft     = sub ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <main className="min-h-screen bg-bg">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-white/7 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="font-mono font-bold text-white">ki<span className="text-brand-green">clear</span>.ai</a>
          <div className="flex items-center gap-3">
            {sub && <span className={`text-xs font-mono font-bold border px-3 py-1 rounded-full ${TIER_COLOR[sub.tier] ?? TIER_COLOR.starter}`}>{TIER_LABEL[sub.tier] ?? sub.tier}</span>}
            {sub && <button onClick={handlePortal} className="text-xs text-white/40 hover:text-white/60 transition-colors hidden sm:block">Abo verwalten</button>}
            <button onClick={handleLogout} className="text-xs text-white/30 hover:text-white/50 transition-colors">Ausloggen</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-6">

        {/* Kein Abo Banner */}
        {!sub && (
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-400 mb-1">Kein aktives Abo</p>
              <p className="text-white/50 text-sm">Wählen Sie einen Plan um Ihr Nachweispaket zu generieren.</p>
            </div>
            <a href="/checkout" className="shrink-0 bg-brand-green text-bg font-bold px-5 py-2.5 rounded-xl hover:bg-green-300 transition-colors text-sm">Plan wählen →</a>
          </div>
        )}

        {/* Checkout-Erfolg Banner */}
        {searchParams.get('checkout') === 'success' && sub && (
          <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-4 flex items-center justify-between gap-4">
            <p className="text-brand-green text-sm">
              ✓ Zahlung erfolgreich – Ihr <strong>{TIER_LABEL[searchParams.get('tier') ?? ''] ?? searchParams.get('tier')}</strong>-Abo ist jetzt aktiv.
            </p>
            <a href="/dashboard" className="text-xs text-brand-green/60 hover:text-brand-green transition-colors">✕</a>
          </div>
        )}

        {/* Laden-Indikator wenn checkout=success und sub noch nicht da */}
        {searchParams.get('checkout') === 'success' && !sub && !loading && (
          <div className="bg-white/3 border border-white/7 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin shrink-0" />
            <p className="text-white/50 text-sm">Abo wird aktiviert… (kann einige Sekunden dauern)</p>
          </div>
        )}

        {/* Checkout-Fehler Banner */}
        {searchParams.get('checkout') === 'error' && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
            <p className="text-red-400 text-sm">
              ⚠️ Abo konnte nicht aktiviert werden ({searchParams.get('reason') ?? 'unbekannt'}).
              Bitte <a href="mailto:hallo@kiclear.ai" className="underline">Support kontaktieren</a>.
            </p>
          </div>
        )}

        {/* Abo läuft ab */}
        {sub?.cancel_at_period_end && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
            <p className="text-red-400 text-sm">Abo endet in <strong>{daysLeft} Tagen</strong> ({new Date(sub.current_period_end).toLocaleDateString('de-DE')})</p>
            <button onClick={handlePortal} className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">Reaktivieren</button>
          </div>
        )}

        {/* Assessment + Abo Cards */}
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Assessment */}
          <div className="bg-bg-card border border-white/7 rounded-2xl p-6">
            <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-4">Assessment</p>
            {assessment?.completed ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full border-2 border-brand-green/30 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-white">{assessment.score}</span>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-1">Compliance-Score</p>
                    {gradeConfig && <span className={`text-xs font-bold border px-2 py-0.5 rounded-full ${gradeConfig.bg} ${gradeConfig.color}`}>{gradeConfig.label}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/50">Risikoklasse</span>
                  <span className={`font-bold font-mono ${RISK_COLOR[assessment.risk_class ?? ''] ?? 'text-white'}`}>{assessment.risk_class ?? '–'}</span>
                </div>
                {assessment.imported_from_kicheck && <p className="text-xs text-brand-green/60">↳ Importiert von kicheck.ai</p>}
                <a href="https://kicheck.ai/check" target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/50 transition-colors">Assessment aktualisieren →</a>
              </div>
            ) : (
              <AssessmentImport onImported={loadData} />
            )}
          </div>

          {/* Abo */}
          <div className="bg-bg-card border border-white/7 rounded-2xl p-6">
            <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-4">Abonnement</p>
            {sub ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold border px-3 py-1 rounded-full ${TIER_COLOR[sub.tier] ?? TIER_COLOR.starter}`}>{TIER_LABEL[sub.tier] ?? sub.tier}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${sub.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-amber-400/10 text-amber-400'}`}>
                    {sub.status === 'active' ? 'Aktiv' : sub.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm"><span className="text-white/50">Verlängerung</span><span className="text-white">{new Date(sub.current_period_end).toLocaleDateString('de-DE')}</span></div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Updates</span>
                  <span className="text-white/70 text-xs">{sub.tier === 'starter' ? '1× jährlich' : sub.tier === 'business' ? 'Gesetz + jährlich' : 'Sofort + Gesetz + jährlich'}</span>
                </div>
                <button onClick={handlePortal} className="text-xs text-white/40 hover:text-white/60 transition-colors text-left">Abo & Rechnungen →</button>
              </div>
            ) : (
              <div>
                <p className="text-white/40 text-sm mb-4">Kein aktives Abo.</p>
                <a href="/checkout" className="inline-block bg-brand-green text-bg text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-300 transition-colors">Jetzt buchen →</a>
              </div>
            )}
          </div>
        </div>

        {/* Generate CTA */}
        <div className={`rounded-2xl p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${canGenerate ? 'bg-brand-green/5 border-brand-green/20' : 'bg-bg-card border-white/7'}`}>
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Nachweispaket generieren</h2>
            <p className="text-white/50 text-sm">
              {!sub ? 'Aktives Abo erforderlich.' :
               sub.status !== 'active' ? 'Abo nicht aktiv.' :
               !assessment?.completed ? 'Bitte zuerst den Check auf kicheck.ai abschließen.' :
               isGenerating ? 'Dokumente werden generiert…' :
               bundles.length > 0 ? 'Neue Version aller Dokumente erstellen (~25 Sek.).' :
               'Erstes Nachweispaket erstellen – ca. 25 Sekunden.'}
            </p>
            {genError && <p className="text-red-400 text-xs mt-2">{genError}</p>}
          </div>
          <button onClick={handleGenerate} disabled={!canGenerate}
            className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${canGenerate ? 'bg-brand-green text-bg hover:bg-green-300 shadow-lg shadow-brand-green/20' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />
                Generiert…
              </span>
            ) : '+ Dokumente generieren'}
          </button>
        </div>

        {/* Bundles */}
        <div>
          <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider font-mono mb-4">Ihre Nachweispakete</h2>
          {bundles.length === 0 ? (
            <div className="bg-bg-card border border-white/7 rounded-2xl p-12 text-center">
              <div className="text-4xl mb-4">📄</div>
              <p className="text-white/40 text-sm">Noch keine Pakete generiert.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {bundles.map(bundle => (
                <div key={bundle.id} className={`bg-bg-card border rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${bundle.status === 'generating' ? 'border-brand-green/30' : 'border-white/7'}`}>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">Nachweispaket v{bundle.version}</span>
                      {bundle.status === 'ready'      && <span className="text-xs bg-green-400/10 text-green-400 border border-green-400/20 px-2 py-0.5 rounded-full">Fertig</span>}
                      {bundle.status === 'generating' && <span className="text-xs bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-0.5 rounded-full flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />Generiert… ({bundle.docs_done}/{bundle.docs_total})</span>}
                      {bundle.status === 'error'      && <span className="text-xs bg-red-400/10 text-red-400 border border-red-400/20 px-2 py-0.5 rounded-full">Fehler</span>}
                      {bundle.update_reason           && <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">{bundle.update_reason}</span>}
                    </div>
                    <p className="text-xs text-white/40">
                      {bundle.docs_done} Dokumente
                      {bundle.generation_completed_at && <> · {new Date(bundle.generation_completed_at).toLocaleDateString('de-DE')}</>}
                      {bundle.law_reference && <> · <span className="text-amber-400/70">{bundle.law_reference}</span></>}
                    </p>
                    {bundle.zip_url && bundle.zip_expires_at && (
                      <p className="text-xs text-white/25">Link gültig bis {new Date(bundle.zip_expires_at).toLocaleDateString('de-DE')}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {bundle.status === 'ready' && bundle.zip_url && (
                      <a href={bundle.zip_url} download className="flex items-center gap-1.5 text-xs font-semibold text-brand-green border border-brand-green/30 bg-brand-green/10 px-4 py-2 rounded-lg hover:bg-brand-green/20 transition-colors">↓ ZIP herunterladen</a>
                    )}
                    {bundle.status === 'generating' && <div className="w-5 h-5 border-2 border-brand-green/30 border-t-brand-green rounded-full animate-spin" />}
                    {bundle.status === 'error' && <button onClick={handleGenerate} className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">Erneut versuchen</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-white/25 font-mono">{user?.email}</p>
          <div className="flex gap-4 text-xs text-white/20 font-mono">
            <a href="/impressum"    className="hover:text-white/40 transition-colors">Impressum</a>
            <span>·</span>
            <a href="/datenschutz" className="hover:text-white/40 transition-colors">Datenschutz</a>
            <span>·</span>
            <a href="/agb"         className="hover:text-white/40 transition-colors">AGB</a>
          </div>
        </div>
      </div>
    </main>
  );
}

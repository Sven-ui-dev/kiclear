'use client';
// build: 2026-03-26-v2

import { useState } from 'react';

const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { getSupabaseBrowser } = await import('@/lib/supabase');
    const { data: { session } } = await getSupabaseBrowser().auth.getSession();
    if (session?.access_token) return { 'Authorization': `Bearer ${session.access_token}` };
  } catch { /* ignore */ }
  return {};
}

export function AssessmentImport({ onImported }: { onImported: () => void }) {
  const [sessionInput, setSessionInput] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [showManual,   setShowManual]   = useState(false);

  const handleManualImport = async () => {
    const sid = sessionInput.trim();
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Ask kicheck.ai to create a transfer token for this session
      const transferRes = await fetch(`${KICHECK_URL}/api/check/transfer`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sid, target_tier: 'starter' }),
      });
      const transferData = await transferRes.json().catch(() => ({})) as Record<string, unknown>;
      if (!transferRes.ok) {
        const msg = (transferData?.error as Record<string,unknown>)?.message as string
          ?? transferData?.message as string
          ?? `kicheck Fehler ${transferRes.status}`;
        throw new Error(msg);
      }
      const token = transferData.transfer_token as string | undefined;
      if (!token) throw new Error('Kein Transfer-Token erhalten');

      // 2. Import into kiclear
      const authHdr = await getAuthHeaders();
      const importRes = await fetch('/api/assessment/import', {
        method:  'POST',
        headers: { ...authHdr, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ transfer_token: token }),
      });
      const importData = await importRes.json().catch(() => ({})) as Record<string, unknown>;
      if (!importRes.ok) {
        const msg = (importData?.error as Record<string,unknown>)?.message as string
          ?? importData?.message as string
          ?? `Import Fehler ${importRes.status}`;
        throw new Error(msg);
      }

      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-white/50 text-sm leading-relaxed">
        Ihr Assessment wurde noch nicht mit diesem Konto verknüpft.
      </p>

      {/* Primary: go to kicheck.ai and click import button */}
      <a
        href={`${KICHECK_URL}/check/ergebnis`}
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-brand-green text-bg text-sm font-bold px-4 py-3 rounded-xl
          hover:bg-green-300 transition-colors text-center"
      >
        Assessment von kicheck.ai importieren →
      </a>

      <p className="text-white/30 text-xs leading-relaxed">
        Öffnet Ihr kicheck.ai Ergebnis. Klicken Sie dort auf{' '}
        <span className="text-white/50 font-medium">„Bereits Kunde bei kiclear.ai? Assessment direkt importieren"</span>
        {' '}– der Import erfolgt automatisch.
      </p>

      {/* Fallback: manual session ID input */}
      <div className="border-t border-white/7 pt-3">
        {!showManual ? (
          <button
            onClick={() => setShowManual(true)}
            className="text-xs text-white/25 hover:text-white/50 transition-colors"
          >
            Alternativ: Session-ID manuell eingeben →
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-white/30 text-xs">
              Session-ID aus kicheck.ai Browser-Konsole:{' '}
              <code className="bg-white/5 px-1.5 py-0.5 rounded font-mono">
                localStorage.getItem(&apos;kicheck_session_id&apos;)
              </code>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={sessionInput}
                onChange={e => setSessionInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualImport()}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5
                  text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-brand-green/50 font-mono"
              />
              <button
                onClick={handleManualImport}
                disabled={loading || !sessionInput.trim()}
                className="px-3 py-1.5 bg-brand-green text-bg text-xs font-bold rounded-lg
                  hover:bg-green-300 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {loading ? '…' : 'Importieren'}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">⚠ {error}</p>
            )}
          </div>
        )}
      </div>

      {/* New check */}
      <div className="border-t border-white/7 pt-2">
        <a
          href={`${KICHECK_URL}/check`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/20 hover:text-white/40 transition-colors"
        >
          Noch kein Assessment? Kostenloser EU AI Act Check →
        </a>
      </div>
    </div>
  );
}

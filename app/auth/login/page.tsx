'use client'; // build: 2026-03-22
import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

function LoginContent() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let didRedirect = false;

    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase');
      const sb = getSupabaseBrowser();

      const { error: authError } = await sb.auth.signInWithPassword({ email, password });

      if (authError) {
        const msg =
          authError.message.includes('Invalid login credentials')
            ? 'E-Mail oder Passwort falsch.'
            : authError.message.includes('Email not confirmed')
            ? 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse (E-Mail-Postfach prüfen).'
            : authError.message.includes('rate limit')
            ? 'Zu viele Versuche. Bitte kurz warten.'
            : `Fehler: ${authError.message}`;
        setError(msg);
        return;
      }

      // Erfolg → redirect ohne router.refresh() der State killt
      didRedirect = true;
      window.location.href = redirect;

    } catch (err) {
      setError(
        err instanceof Error
          ? `Verbindungsfehler: ${err.message}`
          : 'Verbindungsfehler. Bitte Seite neu laden.'
      );
    } finally {
      // setLoading(false) nur wenn kein Redirect passiert
      // sonst flackert der Button kurz bevor die Seite wechselt
      if (!didRedirect) setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <a href="/" className="font-mono text-white/40 hover:text-white/70 text-sm mb-10 block">
          ← ki<span className="text-brand-green">clear</span>.ai
        </a>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Einloggen</h1>
        <p className="text-white/40 text-sm mb-8">Willkommen zurück.</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">E-Mail</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              disabled={loading}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors
                text-sm disabled:opacity-50"
              placeholder="name@unternehmen.de"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">Passwort</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors
                text-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {/* Fehlermeldung – persistent bis nächster Submit */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3
              text-red-400 text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-green text-bg font-bold py-3 rounded-xl mt-2
              hover:bg-green-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />Einloggen…</>
              : 'Einloggen →'
            }
          </button>
        </form>

        <p className="text-white/30 text-sm text-center mt-6">
          Noch kein Konto?{' '}
          <a
            href={`/auth/register${redirect !== '/dashboard' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="text-brand-green hover:text-green-300 transition-colors"
          >
            Registrieren
          </a>
        </p>
      </div>
    </main>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-bg flex items-center justify-center'><span className='text-white/50'>Laden...</span></div>}>
      <LoginContent />
    </Suspense>
  );
}

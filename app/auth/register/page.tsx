'use client'; // build: 2026-03-22
import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

function RegisterContent() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [company,    setCompany]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [registered, setRegistered] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben.'); return; }
    setLoading(true);
    setError('');
    let didRedirect = false;

    try {
      const { getSupabaseBrowser } = await import('@/lib/supabase');
      const sb = getSupabaseBrowser();

      const { data, error: authError } = await sb.auth.signUp({
        email,
        password,
        options: { data: { company_name: company } },
      });

      if (authError) {
        setError(
          authError.message.includes('already registered') || authError.message.includes('already been registered')
            ? 'Diese E-Mail ist bereits registriert. Bitte einloggen.'
            : `Fehler: ${authError.message}`
        );
        return;
      }

      // Profil mit Unternehmensname anlegen
      if (data.user && company) {
        await sb.from('profiles').upsert({ id: data.user.id, company_name: company });
      }

      // Wenn E-Mail-Bestätigung deaktiviert → Session sofort vorhanden
      if (data.session) {
        didRedirect = true;
        window.location.href = redirect;
      } else {
        setRegistered(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Verbindungsfehler: ${err.message}`
          : 'Verbindungsfehler. Bitte Seite neu laden.'
      );
    } finally {
      if (!didRedirect) setLoading(false);
    }
  };

  if (registered) {
    return (
      <main className="min-h-screen bg-bg bg-grid flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">📧</div>
          <h1 className="text-2xl font-bold text-white mb-3">E-Mail bestätigen</h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm mx-auto">
            Wir haben eine Bestätigungs-E-Mail an{' '}
            <span className="text-white font-medium">{email}</span> gesendet.
            Bitte klicken Sie auf den Link um Ihr Konto zu aktivieren.
          </p>
          <p className="text-white/30 text-xs mt-4">
            Keine E-Mail erhalten? Spam-Ordner prüfen.
          </p>
          <a href="/auth/login"
            className="inline-block text-brand-green hover:text-green-300 text-sm mt-6 transition-colors">
            Zum Login →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <a href="/" className="font-mono text-white/40 hover:text-white/70 text-sm mb-10 block">
          ← ki<span className="text-brand-green">clear</span>.ai
        </a>

        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Konto erstellen</h1>
        <p className="text-white/40 text-sm mb-8">Für den Zugang nach dem Checkout.</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate>
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">
              Unternehmensname <span className="text-white/25">(optional)</span>
            </label>
            <input
              type="text" autoComplete="organization"
              value={company} onChange={e => setCompany(e.target.value)}
              disabled={loading}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors
                text-sm disabled:opacity-50"
              placeholder="Mustermann GmbH"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">E-Mail *</label>
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
            <label className="block text-xs text-white/50 font-mono mb-2">
              Passwort * <span className="text-white/25">(min. 8 Zeichen)</span>
            </label>
            <input
              type="password" required autoComplete="new-password" minLength={8}
              value={password} onChange={e => setPassword(e.target.value)}
              disabled={loading}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors
                text-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3
              text-red-400 text-sm flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <p className="text-white/25 text-xs leading-relaxed">
            Mit der Registrierung akzeptieren Sie unsere{' '}
            <a href="/agb" className="text-white/40 hover:text-white/60 underline transition-colors">AGB</a>
            {' '}und die{' '}
            <a href="/datenschutz" className="text-white/40 hover:text-white/60 underline transition-colors">Datenschutzerklärung</a>.
          </p>

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-green text-bg font-bold py-3 rounded-xl
              hover:bg-green-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-bg/30 border-t-bg rounded-full animate-spin" />}
            {loading ? 'Konto wird erstellt…' : 'Konto erstellen →'}
          </button>
        </form>

        <p className="text-white/30 text-sm text-center mt-6">
          Bereits registriert?{' '}
          <a href="/auth/login" className="text-brand-green hover:text-green-300 transition-colors">
            Einloggen
          </a>
        </p>
      </div>
    </main>
  );
}


export default function RegisterPage() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-bg flex items-center justify-center'><span className='text-white/50'>Laden...</span></div>}>
      <RegisterContent />
    </Suspense>
  );
}

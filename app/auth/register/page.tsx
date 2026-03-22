'use client'; // build: 2026-03-22
import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

function RegisterContent() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [company,     setCompany]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [registered,  setRegistered]  = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Passwort muss mindestens 8 Zeichen haben.'); return; }
    setLoading(true);
    setError('');

    const { data, error } = await supabaseBrowser.auth.signUp({
      email, password,
      options: { data: { company_name: company } },
    });

    if (error) {
      setError(error.message === 'User already registered'
        ? 'Diese E-Mail ist bereits registriert.'
        : error.message);
      setLoading(false);
      return;
    }

    // Update profile with company name
    if (data.user && company) {
      await supabaseBrowser.from('profiles').upsert({
        id: data.user.id,
        company_name: company,
      });
    }

    // If session exists immediately (email confirmation disabled) → redirect
    if (data.session) {
      router.push(redirect);
    } else {
      setRegistered(true);
    }
  };

  if (registered) {
    return (
      <main className="min-h-screen bg-bg bg-grid flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-6">📧</div>
          <h1 className="text-2xl font-bold text-white mb-3">E-Mail bestätigen</h1>
          <p className="text-white/50 text-sm leading-relaxed">
            Wir haben eine Bestätigungs-E-Mail an <span className="text-white">{email}</span> gesendet.
            Bitte klicken Sie auf den Link in der E-Mail um Ihr Konto zu aktivieren.
          </p>
          <a href="/auth/login" className="text-brand-green hover:text-green-300 text-sm mt-6 block transition-colors">
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
        <p className="text-white/40 text-sm mb-8">
          Für den Zugang nach dem Checkout.
        </p>

        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">Unternehmensname</label>
            <input
              type="text" autoComplete="organization"
              value={company} onChange={e => setCompany(e.target.value)}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors text-sm"
              placeholder="Mustermann GmbH"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">E-Mail *</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors text-sm"
              placeholder="name@unternehmen.de"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">Passwort * (min. 8 Zeichen)</label>
            <input
              type="password" required autoComplete="new-password" minLength={8}
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors text-sm"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <p className="text-white/25 text-xs leading-relaxed">
            Mit der Registrierung akzeptieren Sie unsere{' '}
            <a href="/agb" className="text-white/40 hover:text-white/60 underline">AGB</a>
            {' '}und{' '}
            <a href="/datenschutz" className="text-white/40 hover:text-white/60 underline">Datenschutzerklärung</a>.
          </p>

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-green text-bg font-bold py-3 rounded-xl
              hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
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

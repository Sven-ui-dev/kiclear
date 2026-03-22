'use client'; // build: 2026-03-22
import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase';

function LoginContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const redirect    = params.get('redirect') ?? '/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'E-Mail oder Passwort falsch.'
        : error.message);
      setLoading(false);
    } else {
      router.push(redirect);
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

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">E-Mail</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-bg-card border border-white/10 rounded-xl px-4 py-3 text-white
                placeholder-white/20 focus:outline-none focus:border-brand-green/50 transition-colors text-sm"
              placeholder="name@unternehmen.de"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 font-mono mb-2">Passwort</label>
            <input
              type="password" required autoComplete="current-password"
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

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-green text-bg font-bold py-3 rounded-xl
              hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Einloggen…' : 'Einloggen →'}
          </button>
        </form>

        <p className="text-white/30 text-sm text-center mt-6">
          Noch kein Konto?{' '}
          <a href={`/auth/register${redirect !== '/dashboard' ? `?redirect=${redirect}` : ''}`}
            className="text-brand-green hover:text-green-300 transition-colors">
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

// build: 2026-03-22
// POST /api/auth/register – Serverseitige Registrierung mit Cookie-Setzung
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({
  email:        z.string().email(),
  password:     z.string().min(8),
  company_name: z.string().optional(),
  redirect:     z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const { email, password, company_name, redirect } = result.data;
    const origin = req.headers.get('origin') ?? 'https://kiclear.ai';

    const dest        = (redirect ?? '/dashboard').startsWith('/checkout')
      ? (redirect ?? '/dashboard') + ((redirect ?? '').includes('?') ? '&autostart=1' : '?autostart=1')
      : (redirect ?? '/dashboard');
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(dest)}`;

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Response VOR Supabase-Call erstellen
    const response = NextResponse.json({ ok: true, has_session: false, requires_confirmation: true, email });

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              secure:   process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path:     '/',
            });
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data:            { company_name: company_name ?? '' },
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      const msg = error.message.includes('already registered')
        ? 'Diese E-Mail ist bereits registriert.'
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Profil anlegen
    if (data.user && company_name) {
      await supabaseAdmin.from('profiles').upsert({ id: data.user.id, company_name });
    }

    const hasSession = !!data.session;

    console.log('[/api/auth/register] OK für:', email,
      '| Session:', hasSession,
      '| Cookies:', response.cookies.getAll().map(c => c.name));

    // Body aktualisieren
    const finalResponse = NextResponse.json({
      ok:                    true,
      has_session:           hasSession,
      requires_confirmation: !hasSession,
      email,
    });

    // Cookies aus response übertragen
    response.cookies.getAll().forEach(c => {
      finalResponse.cookies.set(c.name, c.value, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path:     '/',
      });
    });

    return finalResponse;

  } catch (e) {
    console.error('[/api/auth/register]', e);
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

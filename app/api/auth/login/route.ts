// build: 2026-03-22
// POST /api/auth/login – Serverseitiger Login mit Cookie-Setzung
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Response-Objekt VOR dem Supabase-Call erstellen
    // damit setAll() die Cookies direkt in die Response schreiben kann
    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Cookies direkt in die Response schreiben
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              httpOnly:  true,
              secure:    process.env.NODE_ENV === 'production',
              sameSite:  'lax',
              path:      '/',
            });
          });
        },
      },
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email:    result.data.email,
      password: result.data.password,
    });

    if (error) {
      const msg =
        error.message.includes('Invalid login credentials')
          ? 'E-Mail oder Passwort falsch.'
          : error.message.includes('Email not confirmed')
          ? 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'
          : error.message;
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ error: 'Keine Session erhalten.' }, { status: 401 });
    }

    console.log('[/api/auth/login] OK für:', data.user?.email,
      '| Cookies gesetzt:', response.cookies.getAll().map(c => c.name));

    // response hat bereits ok:true im Body + Cookies im Header
    return response;

  } catch (e) {
    console.error('[/api/auth/login]', e);
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

// build: 2026-03-22-v24
// POST /api/auth/login
// Gibt Session-Tokens zurück damit der Client sie selbst setzen kann.
// Hybrid-Ansatz: Server validiert, Client setzt Session.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

    // Direkt mit supabase-js (keine SSR-Komplikationen)
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
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

    console.log('[/api/auth/login] OK:', data.user?.email);

    // Session-Tokens an den Client zurückgeben
    // Client setzt sie dann mit supabase.auth.setSession()
    return NextResponse.json({
      ok:            true,
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at,
      user: {
        id:    data.user?.id,
        email: data.user?.email,
      },
    });

  } catch (e) {
    console.error('[/api/auth/login]', e);
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

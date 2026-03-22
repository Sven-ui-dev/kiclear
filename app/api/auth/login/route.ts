// build: 2026-03-22
// POST /api/auth/login – Serverseitiger Login
// Setzt Supabase-Session als HttpOnly Cookie direkt auf dem Server.
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabase';
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
      return Response.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase    = createSupabaseServer(cookieStore);

    const { data, error } = await supabase.auth.signInWithPassword({
      email:    result.data.email,
      password: result.data.password,
    });

    if (error) {
      return Response.json({
        error: error.message.includes('Invalid login credentials')
          ? 'E-Mail oder Passwort falsch.'
          : error.message.includes('Email not confirmed')
          ? 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.'
          : error.message,
      }, { status: 401 });
    }

    return Response.json({
      ok:    true,
      email: data.user?.email,
    });
  } catch (e) {
    console.error('[/api/auth/login]', e);
    return Response.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

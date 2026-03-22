// build: 2026-03-22
// GET /auth/callback – Supabase Auth Code-Exchange
// Supabase redirectet nach Login hierher mit einem Code-Parameter.
// Diese Route tauscht den Code gegen eine Session und setzt den Cookie.
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code     = searchParams.get('code');
  const next     = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase    = createSupabaseServer(cookieStore);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Erfolg: redirect zum Ziel (z.B. /checkout?tier=business&autostart=1)
      const redirectUrl = new URL(next, origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Fehler: zurück zum Login
  return NextResponse.redirect(new URL('/auth/login?error=auth_callback_failed', origin));
}

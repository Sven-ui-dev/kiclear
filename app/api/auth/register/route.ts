// build: 2026-03-22-v24
// POST /api/auth/register
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase.auth.signUp({
      email, password,
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

    if (data.user && company_name) {
      await supabaseAdmin.from('profiles').upsert({ id: data.user.id, company_name });
    }

    const hasSession = !!data.session;

    return NextResponse.json({
      ok:                    true,
      has_session:           hasSession,
      requires_confirmation: !hasSession,
      email,
      // Tokens für client-seitiges setSession()
      access_token:          data.session?.access_token  ?? null,
      refresh_token:         data.session?.refresh_token ?? null,
    });

  } catch (e) {
    console.error('[/api/auth/register]', e);
    return NextResponse.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

// build: 2026-03-22
// POST /api/auth/register – Serverseitige Registrierung
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServer, supabaseAdmin } from '@/lib/supabase';
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
      return Response.json({ error: 'Ungültige Eingabe.' }, { status: 400 });
    }

    const { email, password, company_name, redirect } = result.data;
    const origin = req.headers.get('origin') ?? 'https://kiclear.ai';

    const dest        = (redirect ?? '/dashboard').startsWith('/checkout')
      ? (redirect ?? '/dashboard') + ((redirect ?? '').includes('?') ? '&autostart=1' : '?autostart=1')
      : (redirect ?? '/dashboard');
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(dest)}`;

    const cookieStore = cookies();
    const supabase    = createSupabaseServer(cookieStore);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data:            { company_name: company_name ?? '' },
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      return Response.json({
        error: error.message.includes('already registered')
          ? 'Diese E-Mail ist bereits registriert.'
          : error.message,
      }, { status: 400 });
    }

    if (data.user && company_name) {
      await supabaseAdmin
        .from('profiles')
        .upsert({ id: data.user.id, company_name });
    }

    return Response.json({
      ok:                    true,
      has_session:           !!data.session,
      requires_confirmation: !data.session,
      email,
    });
  } catch (e) {
    console.error('[/api/auth/register]', e);
    return Response.json({ error: 'Serverfehler.' }, { status: 500 });
  }
}

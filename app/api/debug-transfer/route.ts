export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  const { data: tokens } = await supabaseAdmin
    .from('transfer_tokens')
    .select('token, used, used_at, expires_at, created_at, score, risk_class, email')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: assessments } = await supabaseAdmin
    .from('assessments')
    .select('id, user_id, score, risk_class, imported_from_kicheck, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const env = {
    KICHECK_TRANSFER_SECRET_set: !!process.env.KICHECK_TRANSFER_SECRET,
    KICHECK_TRANSFER_SECRET_len: (process.env.KICHECK_TRANSFER_SECRET ?? '').length,
    NEXT_PUBLIC_KICHECK_URL:     process.env.NEXT_PUBLIC_KICHECK_URL ?? 'NOT SET',
  };

  let specificToken = null;
  if (token) {
    const { data } = await supabaseAdmin
      .from('transfer_tokens').select('*').eq('token', token).single();
    specificToken = data;
  }

  return Response.json({ env, tokens, assessments, specificToken });
}

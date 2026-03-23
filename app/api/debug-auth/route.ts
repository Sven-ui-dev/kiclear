export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);

  const { data: allAssessments } = await supabaseAdmin
    .from('assessments')
    .select('id, user_id, score, completed, created_at')
    .order('created_at', { ascending: false }).limit(5);

  let userAssessment = null;
  if (auth.user) {
    const { data } = await supabaseAdmin
      .from('assessments')
      .select('id, score, risk_class, completed')
      .eq('user_id', auth.user.id)
      .eq('completed', true)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    userAssessment = data;
  }

  return Response.json({
    auth:            auth.user ? { ok: true, user_id: auth.user.id, email: auth.user.email } : { ok: false },
    user_assessment: userAssessment,
    all_assessments: allAssessments ?? [],
    authorization_header: req.headers.get('authorization') ? 'present' : 'missing',
    cookie_header:        req.headers.get('cookie') ? 'present' : 'missing',
  });
}

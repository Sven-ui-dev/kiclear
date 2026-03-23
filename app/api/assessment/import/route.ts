export const dynamic = 'force-dynamic';
// build: 2026-03-23-v35
// POST /api/assessment/import – Assessment per Transfer-Token manuell importieren
import { NextRequest } from 'next/server';
import { requireAuth, E } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({ transfer_token: z.string().uuid() });

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const body   = await req.json().catch(() => ({}));
  const result = schema.safeParse(body);
  if (!result.success) return E.badRequest('Ungültiger transfer_token.');

  const token       = result.data.transfer_token;
  const KICHECK_URL = process.env.NEXT_PUBLIC_KICHECK_URL ?? 'https://kicheck.ai';
  const secret      = process.env.KICHECK_TRANSFER_SECRET ?? '';

  if (!secret) return E.internal('KICHECK_TRANSFER_SECRET nicht konfiguriert.');

  try {
    const res = await fetch(
      `${KICHECK_URL}/api/check/session-from-token/${token}`,
      { headers: { 'x-transfer-secret': secret } }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errObj = err?.error as Record<string, unknown> | undefined;
      const msg = (errObj?.message as string) ?? `kicheck ${res.status}`;
      return Response.json({ error: msg }, { status: 400 });
    }

    const { answers_json, score, risk_class } = await res.json();

    // Duplikat-Check
    const { data: existing } = await supabaseAdmin
      .from('assessments')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('kicheck_session_id', token)
      .maybeSingle();

    if (existing) {
      return Response.json({ ok: true, already_imported: true, assessment_id: existing.id });
    }

    const { data: assessment, error: dbErr } = await supabaseAdmin
      .from('assessments')
      .insert({
        user_id: auth.user.id, answers: answers_json,
        score, risk_class, completed: true,
        imported_from_kicheck: true, kicheck_session_id: token,
      })
      .select().single();

    if (dbErr) return E.internal(dbErr.message);

    return Response.json({ ok: true, assessment_id: assessment.id, score, risk_class });
  } catch (e) {
    return E.internal(e instanceof Error ? e.message : 'Fehler');
  }
}

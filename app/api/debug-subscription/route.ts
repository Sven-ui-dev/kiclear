export const dynamic = 'force-dynamic';
// build: 2026-03-23-debug
import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data: subs }        = await supabaseAdmin.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: assessments } = await supabaseAdmin.from('assessments').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: bundles }     = await supabaseAdmin.from('document_bundles').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: documents }   = await supabaseAdmin.from('documents').select('id, bundle_id, doc_type, status, created_at').order('created_at', { ascending: false }).limit(10);
  return Response.json({ subscriptions: subs ?? [], assessments: assessments ?? [], document_bundles: bundles ?? [], documents: documents ?? [] });
}

// POST: Seed Assessment für Testing
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const userId = body.user_id as string;
  if (!userId) return Response.json({ error: 'user_id fehlt' }, { status: 400 });

  // Minimales aber valides Assessment anlegen
  // Vorher: bestehende Assessments für diesen User löschen
  await supabaseAdmin.from('assessments').delete().eq('user_id', userId);

  const { data, error } = await supabaseAdmin
    .from('assessments')
    .insert({
      user_id:               userId,
      answers:               { A1: 'yes', A2: 'DE', A3: 'DE', B1: 'yes', B2: 'no', C1: 'yes', D1: 'no', E1: 'yes' },
      score:                 65,
      risk_class:            'MEDIUM',
      grade:                 'GELB',
      completed:             true,
      imported_from_kicheck: false,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, assessment: data, seeded_for_user: userId });
}

// GET /api/debug-subscription?user_id=xxx – direkte DB-Abfrage für einen User

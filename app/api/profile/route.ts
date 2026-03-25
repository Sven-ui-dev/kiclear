// GET /api/profile  – Profildata laden (company_name, land)
// PATCH /api/profile – company_name aktualisieren
export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth, E } from '@/lib/api-helpers';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('company_name, land')
    .eq('id', auth.user.id)
    .single();

  return Response.json({
    company_name: profile?.company_name ?? '',
    land:         profile?.land ?? 'DE',
  });
}

const patchSchema = z.object({
  company_name: z.string().min(1).max(200).optional(),
  land:         z.enum(['DE', 'AT', 'CH']).optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.user) return (auth as { user: null; response: Response }).response;

  const body = await req.json().catch(() => ({}));
  const result = patchSchema.safeParse(body);
  if (!result.success) return E.badRequest('Ungültige Profildaten.');

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id:           auth.user.id,
      ...result.data,
      updated_at:   new Date().toISOString(),
    });

  if (error) return E.internal(error.message);

  return Response.json({ ok: true });
}

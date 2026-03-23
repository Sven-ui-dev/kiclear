import { NextRequest } from 'next/server';
import { createSupabaseServer } from './supabase';
import { cookies } from 'next/headers';
import { z } from 'zod';

export function err(code: string, message: string, status: number, details?: object) {
  return Response.json(
    { error: { code, message, ...(details ? { details } : {}), request_id: `req_kiclear_${Date.now()}` } },
    { status }
  );
}

export const E = {
  badRequest:    (msg = 'Ungültige Anfrage.', d?: object) => err('INVALID_BODY', msg, 400, d),
  unauthorized:  ()           => err('UNAUTHORIZED',      'Nicht authentifiziert.',    401),
  forbidden:     ()           => err('FORBIDDEN',         'Keine Berechtigung.',       403),
  notFound:      (w = 'Ressource') => err('NOT_FOUND',    `${w} nicht gefunden.`,      404),
  conflict:      (msg: string) => err('CONFLICT',          msg,                         409),
  unprocessable: (msg: string, d?: object) => err('VALIDATION_ERROR', msg,            422, d),
  tooManyReq:    ()           => err('RATE_LIMITED',       'Zu viele Anfragen.',        429),
  internal:      (msg = 'Interner Serverfehler.') => err('INTERNAL_ERROR', msg, 500),
  gone:           (msg = 'Ressource abgelaufen oder nicht mehr verfügbar.') => err('GONE', msg, 410),
  noSubscription: () => err('NO_SUBSCRIPTION', 'Kein aktives Abonnement gefunden.', 402),
};

export async function getAuthUser(req?: NextRequest) {
  const cookieStore = cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function parseBody<T>(
  req: NextRequest,
  schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false; error: { flatten: () => { fieldErrors: Record<string, string[]> } } } }
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  try {
    const json = await req.json();
    const result = schema.safeParse(json);
    if (!result.success) {
      return { data: null, error: E.badRequest('Validierungsfehler.', { issues: result.error.flatten().fieldErrors }) };
    }
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: E.badRequest('Ungültiger JSON-Body.') };
  }
}

export async function requireAuth(req?: NextRequest): Promise<{ user: { id: string; email: string } } | { user: null; response: Response }> {
  // 1. Cookie-basierte Session (Server-Side)
  const cookieStore = cookies();
  const supabase = createSupabaseServer(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user && !error) return { user: { id: user.id, email: user.email! } };

  // 2. Bearer-Token aus Authorization Header (Client-Side setSession)
  const authHeader = req?.headers.get('authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: { user: tokenUser }, error: tokenError } = await client.auth.getUser(token);
    if (tokenUser && !tokenError) {
      return { user: { id: tokenUser.id, email: tokenUser.email! } };
    }
  }

  return { user: null, response: E.unauthorized() };
}

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseBrowser = createClient(URL, ANON);

export function createSupabaseServer(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll:  ()            => cookieStore.getAll(),
      setAll:  (cookiesToSet) => {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Route Handler */ }
      },
    },
  });
}

export const supabaseAdmin = createClient(URL, SRK, {
  auth: { autoRefreshToken: false, persistSession: false },
});

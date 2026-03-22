import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

const getUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
  return url;
};

const getAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
  return key;
};

const getServiceKey = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return key;
};

let browserClient: ReturnType<typeof createClient> | null = null;
let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient(getUrl(), getAnonKey());
  }
  return browserClient;
}

export function createSupabaseServer(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(getUrl(), getAnonKey(), {
    cookies: {
      getAll:  ()            => cookieStore.getAll(),
      setAll:  (cookiesToSet) => {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Route Handler */ }
      },
    },
  });
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(getUrl(), getServiceKey(), {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

// Backward compatible exports
export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop) {
    return (...args: any[]) => (getSupabaseAdmin() as any)[prop](...args);
  }
});

export const supabaseBrowser = new Proxy({} as any, {
  get(_, prop) {
    return (...args: any[]) => (getSupabaseBrowser() as any)[prop](...args);
  }
});

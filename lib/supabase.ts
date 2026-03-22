// build: 2026-03-22
// ─────────────────────────────────────────────────────────────────────────────
// kiclear.ai – Supabase Client
//
// FIXES:
// 1. Kein "URL" als Variablenname – überschreibt den globalen URL-Constructor
// 2. Lazy-Init für supabaseBrowser – kein Crash bei fehlenden Env-Vars
// 3. Lazy-Init für supabaseAdmin – kein Crash beim Modul-Import
// ─────────────────────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_SRK  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Browser Client (Lazy Singleton) ──────────────────────────────────────────
let _browserClient: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (!_browserClient) {
    if (!SUPABASE_URL || !SUPABASE_ANON) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen in .env.local');
    }
    _browserClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession:    true,
        autoRefreshToken:  true,
        detectSessionInUrl: true,
      },
    });
  }
  return _browserClient;
}

// Rückwärtskompatibel: supabaseBrowser als Proxy der lazy initialisiert
export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseBrowser() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Server Client (für Route Handlers mit Cookies) ───────────────────────────
export function createSupabaseServer(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll: ()             => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch { /* Server Component – ignore */ }
      },
    },
  });
}

// ── Admin Client (Lazy Singleton, Server-only) ────────────────────────────────
let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    if (!SUPABASE_URL || !SUPABASE_SRK) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen');
    }
    _adminClient = createClient(SUPABASE_URL, SUPABASE_SRK, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getAdminClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

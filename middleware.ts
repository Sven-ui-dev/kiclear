// build: 2026-03-22
// Supabase Auth Middleware
// Refresht die Session bei jedem Request und setzt den Cookie neu.
// Ohne diese Middleware kennt der Server die Browser-Session nicht.
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // /api/auth/* aus Middleware ausschließen
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: ()            => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Session refreshen – setzt Cookie in Response
  // Middleware darf NIEMALS crashen
  try {
    await supabase.auth.getUser();
  } catch {
    // Im Fehlerfall weiterleiten
  }

  return res;
}

export const config = {
  matcher: [
    // Alle Routen außer statische Assets und Supabase-Callbacks
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|ico|css|js)$).*)',
  ],
};

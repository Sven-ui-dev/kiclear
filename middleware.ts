// build: 2026-03-22
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // API-Auth-Routes brauchen keine Session-Refresh (setzen Session selbst)
  // Statische Assets und interne Next.js-Routen überspringen
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/checkout/complete') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Supabase-Keys verfügbar?
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.next();

  try {
    const res      = NextResponse.next();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: ()             => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
    return res;
  } catch {
    // Middleware darf nie crashen – im Fehlerfall einfach weiterlassen
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|ico|css|js)$).*)',
  ],
};

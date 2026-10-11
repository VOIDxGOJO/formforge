import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // The access cookie lives 15 minutes; a valid refresh cookie still counts as signed in,
  // because the client refreshes the session on its first 401.
  const signedIn = request.cookies.has('access_token') || request.cookies.has('refresh_token');
  const { pathname, search } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isProtected = pathname.startsWith('/dashboard');

  if (isProtected && !signedIn) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname + search);
    return NextResponse.redirect(login);
  }
  if (isAuthRoute && request.cookies.has('access_token')) {
    const next = request.nextUrl.searchParams.get('next');
    const target = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard';
    return NextResponse.redirect(new URL(target, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard', '/login', '/register']
};

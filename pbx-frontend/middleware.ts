
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  if (pathname === '/login') {
    // If user is already logged in, redirect to dashboard
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes that require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // '/dashboard/:path*',
    // '/extensions/:path*',
    // '/trunks/:path*',
    // '/queues/:path*',
    // '/outbound-routes/:path*',
    // '/inbound-routes/:path*',
    // '/cdr/:path*',
    // '/system/:path*',
    // '/login'
  ],
};
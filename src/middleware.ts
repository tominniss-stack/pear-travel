import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isSetupPage = request.nextUrl.pathname === '/api/setup';

  // 1. If no token and not on login/setup, redirect to login
  if (!token && !isLoginPage && !isSetupPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If logged in and trying to go to login, redirect to home
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// This tells Next.js which paths to run the middleware on
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
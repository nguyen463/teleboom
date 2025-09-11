
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Cek token dari cookie atau header (sesuaikan useAuth kamu)
  const token = request.cookies.get('chat-app-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '');

  // Protected routes: /chat, /channels, dll.
  const protectedPaths = ['/chat', '/channels'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !token) {
    // Redirect ke login dengan returnUrl
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Kalo udah login, redirect dari /login ke /chat
  if (request.nextUrl.pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/channels/:path*', '/login'],  // Apply ke routes ini
};

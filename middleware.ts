import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ADMIN_EMAILS = ['rbaten@gmail.com', 'gr0x01@pm.me'];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (request.nextUrl.pathname === '/admin/login') {
      if (user && ADMIN_EMAILS.includes(user.email || '')) {
        return NextResponse.redirect(new URL('/admin/review', request.url));
      }
      return supabaseResponse;
    }

    if (request.nextUrl.pathname.startsWith('/admin/auth')) {
      return supabaseResponse;
    }

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

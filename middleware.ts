import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const ADMIN_EMAILS = ['rbaten@gmail.com', 'gr0x01@pm.me'];

// Known AI scraper user agents to block
const AI_SCRAPER_AGENTS = [
  'GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web', 'ClaudeBot',
  'Google-Extended', 'cohere-ai', 'PerplexityBot', 'YouBot', 'Bytespider',
  'Applebot-Extended', 'Meta-ExternalAgent', 'Meta-ExternalFetcher', 'OAI-SearchBot',
  'Omgilibot', 'Diffbot', 'ImagesiftBot', 'PetalBot'
];

export async function middleware(request: NextRequest) {
  // Block known AI scrapers
  const userAgent = request.headers.get('user-agent') || '';
  const isAIScraper = AI_SCRAPER_AGENTS.some(agent =>
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );

  if (isAIScraper) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (request.nextUrl.pathname === '/admin/login') {
      if (user && ADMIN_EMAILS.includes(user.email || '')) {
        return NextResponse.redirect(new URL('/admin/review', request.url));
      }
      return addAntiScrapingHeaders(supabaseResponse);
    }

    if (request.nextUrl.pathname.startsWith('/admin/auth')) {
      return addAntiScrapingHeaders(supabaseResponse);
    }

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    if (!ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
    }
  }

  return addAntiScrapingHeaders(supabaseResponse);
}

function addAntiScrapingHeaders(response: NextResponse): NextResponse {
  // Add anti-AI-scraping headers
  response.headers.set('X-Robots-Tag', 'index, follow, noai, noimageai');
  response.headers.set('Permissions-Policy', 'browsing-topics=()');

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

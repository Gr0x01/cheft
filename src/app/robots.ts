import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheft.app';

// robots.txt group matching is most-specific-wins, so a named crawler ignores the
// `*` group entirely — the admin disallow has to be repeated in every allow group.
const PRIVATE_PATHS = ['/admin/', '/api/admin/', '/api/cron/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ['Googlebot', 'Googlebot-Image', 'Bingbot', 'Slurp'],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: [
          // OAI-SearchBot is deliberately absent: it is ChatGPT's search crawler, not its
          // training crawler, so blocking it would cost referral traffic.
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'Google-Extended',
          'GoogleOther',
          'Applebot-Extended',
          'PerplexityBot',
          'Bytespider',
          'FacebookBot',
          'Meta-ExternalAgent',
          'Meta-ExternalFetcher',
          'cohere-ai',
          'cohere-training-data-crawler',
          'Diffbot',
          'Omgili',
          'Omgilibot',
          'YouBot',
          'AI2Bot',
          'Amazonbot',
          'ImagesiftBot',
          'PetalBot',
          'Scrapy',
          'DataForSeoBot',
          'AhrefsBot',
          'SemrushBot',
          'MJ12bot',
          'DotBot',
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

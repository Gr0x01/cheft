import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheft.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: ['Googlebot', 'Bingbot', 'Slurp'],
        allow: '/',
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'anthropic-ai',
          'ClaudeBot',
          'Claude-Web',
          'Google-Extended',
          'GoogleOther',
          'PerplexityBot',
          'Bytespider',
          'FacebookBot',
          'Meta-ExternalAgent',
          'Meta-ExternalFetcher',
          'cohere-ai',
          'cohere-training-data-crawler',
          'Diffbot',
          'Omgilibot',
          'YouBot',
          'AI2Bot',
          'Amazonbot',
          'ImagesiftBot',
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}

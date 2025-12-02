import { tool } from 'ai';
import { z } from 'zod';

export interface GoogleImageResult {
  url: string;
  thumbnail: string;
  width: number;
  height: number;
  title: string;
  source: string;
}

export async function searchGoogleImages(
  query: string,
  options: { count?: number } = {}
): Promise<GoogleImageResult[]> {
  const GOOGLE_CUSTOM_SEARCH_API_KEY = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
    console.warn('Google Custom Search API not configured');
    return [];
  }

  const count = Math.min(options.count || 5, 10);
  
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_CUSTOM_SEARCH_API_KEY);
  url.searchParams.set('cx', GOOGLE_SEARCH_ENGINE_ID);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', count.toString());
  url.searchParams.set('imgSize', 'large');
  url.searchParams.set('imgType', 'photo');
  url.searchParams.set('safe', 'active');

  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Google Custom Search API error: ${response.status}`);
    }

    const data = await response.json() as {
      items?: Array<{
        link: string;
        image: {
          thumbnailLink: string;
          width: number;
          height: number;
        };
        title: string;
        displayLink: string;
      }>;
    };

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map(item => ({
      url: item.link,
      thumbnail: item.image.thumbnailLink,
      width: item.image.width,
      height: item.image.height,
      title: item.title,
      source: item.displayLink,
    }));
  } catch (error) {
    console.error('Google Images search failed:', error);
    return [];
  }
}

export function createGoogleImageSearchTool() {
  return tool({
    description: 'Search Google Images for chef headshot photos. Returns direct image URLs.',
    parameters: z.object({
      query: z.string().describe('Search query, e.g. "Gordon Ramsay chef headshot"'),
    }),
    execute: async ({ query }) => {
      const results = await searchGoogleImages(query, { count: 5 });
      
      if (results.length === 0) {
        return { results: [], message: 'No images found' };
      }

      return {
        results: results.map((r, i) => ({
          index: i + 1,
          url: r.url,
          thumbnail: r.thumbnail,
          dimensions: `${r.width}x${r.height}`,
          title: r.title,
          source: r.source,
        })),
        message: `Found ${results.length} image(s). Select the best professional headshot.`,
      };
    },
  });
}

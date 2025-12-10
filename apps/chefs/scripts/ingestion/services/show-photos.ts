import { withRetry } from '../utils/retry';

export interface ShowPhotoResult {
  url: string;
  source: 'show_website' | 'llm_search';
  show: string;
  confidence: number;
}

export interface ShowPhotoConfig {
  userAgent?: string;
}

export function createShowPhotoService(config: ShowPhotoConfig = {}) {
  const userAgent = config.userAgent || 'TVChefMap/1.0 (https://github.com/tv-chef-map)';

  async function getTopChefPhoto(chefName: string, season?: string): Promise<ShowPhotoResult | null> {
    try {
      const slug = chefNameToSlug(chefName);
      const peopleUrl = `https://www.bravotv.com/people/${slug}`;
      const html = await fetchPage(peopleUrl);
      
      if (html) {
        const photoUrl = extractBravoPersonPhoto(html);
        if (photoUrl) {
          return {
            url: photoUrl,
            source: 'show_website',
            show: 'Top Chef',
            confidence: 0.95,
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async function getHellsKitchenPhoto(chefName: string, season?: string): Promise<ShowPhotoResult | null> {
    try {
      const baseUrl = 'https://www.fox.com/hells-kitchen/';
      const html = await fetchPage(baseUrl);
      
      if (html) {
        const photoUrl = findChefPhotoInHTML(html, chefName);
        if (photoUrl) {
          return {
            url: photoUrl,
            source: 'show_website',
            show: 'Hells Kitchen',
            confidence: 0.9,
          };
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async function getShowPhoto(
    chefName: string,
    showName: string,
    season?: string
  ): Promise<ShowPhotoResult | null> {
    const normalized = showName.toLowerCase();
    
    if (normalized.includes('top chef')) {
      return getTopChefPhoto(chefName, season);
    } else if (normalized.includes('hell') && normalized.includes('kitchen')) {
      return getHellsKitchenPhoto(chefName, season);
    }
    
    return null;
  }

  async function fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        return null;
      }

      return response.text();
    } catch (error) {
      return null;
    }
  }

  function extractBravoPersonPhoto(html: string): string | null {
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogImageMatch) {
      return ogImageMatch[1];
    }
    return null;
  }

  function chefNameToSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }


  return {
    getShowPhoto,
    getTopChefPhoto,
    getHellsKitchenPhoto,
  };
}

export type ShowPhotoService = ReturnType<typeof createShowPhotoService>;

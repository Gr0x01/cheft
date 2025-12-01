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
      const seasonNum = season ? extractSeasonNumber(season) : null;
      
      if (seasonNum) {
        const url = `https://www.bravotv.com/top-chef/season-${seasonNum}/photos`;
        const html = await fetchPage(url);
        
        if (html) {
          const photoUrl = findChefPhotoInHTML(html, chefName);
          if (photoUrl) {
            return {
              url: photoUrl,
              source: 'show_website',
              show: 'Top Chef',
              confidence: 0.95,
            };
          }
        }
      }
      
      const castUrl = 'https://www.bravotv.com/top-chef/cast';
      const castHtml = await fetchPage(castUrl);
      
      if (castHtml) {
        const photoUrl = findChefPhotoInHTML(castHtml, chefName);
        if (photoUrl) {
          return {
            url: photoUrl,
            source: 'show_website',
            show: 'Top Chef',
            confidence: 0.9,
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

  function findChefPhotoInHTML(html: string, chefName: string): string | null {
    const nameLower = chefName.toLowerCase();
    const nameWords = nameLower.split(/\s+/);
    
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const matches = html.matchAll(imgRegex);
    
    for (const match of matches) {
      const fullTag = match[0];
      const src = match[1];
      
      const altMatch = fullTag.match(/alt=["']([^"']+)["']/i);
      const titleMatch = fullTag.match(/title=["']([^"']+)["']/i);
      
      const altText = altMatch ? altMatch[1].toLowerCase() : '';
      const titleText = titleMatch ? titleMatch[1].toLowerCase() : '';
      const combinedText = `${altText} ${titleText} ${src.toLowerCase()}`;
      
      const matchesAllWords = nameWords.every(word => 
        word.length > 2 && combinedText.includes(word)
      );
      
      if (matchesAllWords && isLikelyPhotoUrl(src)) {
        return makeAbsoluteUrl(src, match.input || '');
      }
    }
    
    return null;
  }

  function isLikelyPhotoUrl(url: string): boolean {
    const lower = url.toLowerCase();
    
    if (lower.includes('logo') || lower.includes('icon') || lower.includes('banner')) {
      return false;
    }
    
    const photoExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    return photoExtensions.some(ext => lower.includes(ext));
  }

  function makeAbsoluteUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).toString();
    } catch {
      return url;
    }
  }

  function extractSeasonNumber(season: string): number | null {
    const match = season.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  return {
    getShowPhoto,
    getTopChefPhoto,
    getHellsKitchenPhoto,
  };
}

export type ShowPhotoService = ReturnType<typeof createShowPhotoService>;

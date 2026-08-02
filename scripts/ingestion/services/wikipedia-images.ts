import { withRetry } from '../utils/retry';

const WIKIMEDIA_API_BASE = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API_BASE = 'https://commons.wikimedia.org/w/api.php';

export interface WikipediaImageResult {
  url: string;
  source: 'wikipedia' | 'commons';
  title: string;
  width?: number;
  height?: number;
  license?: string;
}

export interface WikipediaImageConfig {
  userAgent?: string;
}

export function createWikipediaImageService(config: WikipediaImageConfig = {}) {
  // Wikimedia's UA policy requires a real, identifying contact — a placeholder
  // address risks the whole project being rate-limited or blocked.
  const userAgent = config.userAgent || 'Cheft/1.0 (https://github.com/Gr0x01/chef)';

  async function fetchApi(baseUrl: string, params: Record<string, string>): Promise<unknown> {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return withRetry(async () => {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Wikipedia API error ${response.status}: ${response.statusText}`);
      }

      return response.json();
    });
  }

  async function getChefWikipediaImage(
    chefName: string,
    validationKeywords?: string[]
  ): Promise<WikipediaImageResult | null> {
    const pageResult = await getWikipediaPageWithValidation(chefName, validationKeywords);
    if (pageResult) {
      return pageResult;
    }

    return null;
  }

  async function getWikipediaPageWithValidation(
    chefName: string,
    validationKeywords?: string[]
  ): Promise<WikipediaImageResult | null> {
    try {
      const searchResult = await fetchApi(WIKIMEDIA_API_BASE, {
        action: 'query',
        format: 'json',
        titles: chefName,
        prop: 'pageimages|categories|extracts',
        piprop: 'original',
        cllimit: '20',
        exintro: '1',
        explaintext: '1',
        exsentences: '2',
        redirects: '1',
      }) as {
        query?: {
          pages?: Record<string, {
            pageid?: number;
            title?: string;
            missing?: boolean;
            original?: {
              source: string;
              width: number;
              height: number;
            };
            categories?: Array<{ title: string }>;
            extract?: string;
          }>;
        };
      };

      const pages = searchResult.query?.pages;
      if (!pages) return null;

      const page = Object.values(pages)[0];
      if (!page || !page.pageid || page.missing || !page.original) return null;

      if (!isChefRelatedPage(page.categories, page.extract, chefName, validationKeywords)) {
        console.log(`[wikipedia-images] Skipping "${chefName}": page exists but not chef-related`);
        return null;
      }

      if (!isLikelyPersonPhoto(page.original.source, page.original.width, page.original.height)) {
        console.log(`[wikipedia-images] Skipping "${chefName}": lead image is not a portrait`);
        return null;
      }

      if (!imageDepictsPerson(page.original.source, chefName)) {
        console.log(`[wikipedia-images] Skipping "${chefName}": lead image does not depict them`);
        return null;
      }

      return {
        url: page.original.source,
        source: 'wikipedia',
        title: page.title || chefName,
        width: page.original.width,
        height: page.original.height,
      };
    } catch (error) {
      console.warn(`[wikipedia-images] Failed to get validated page for "${chefName}":`, error);
      return null;
    }
  }

  async function getWikipediaPageImage(title: string): Promise<WikipediaImageResult | null> {
    try {
      const searchResult = await fetchApi(WIKIMEDIA_API_BASE, {
        action: 'query',
        format: 'json',
        titles: title,
        prop: 'pageimages|pageprops',
        piprop: 'original',
        ppprop: 'wikibase_item',
        redirects: '1',
      }) as {
        query?: {
          pages?: Record<string, {
            pageid?: number;
            title?: string;
            original?: {
              source: string;
              width: number;
              height: number;
            };
          }>;
        };
      };

      const pages = searchResult.query?.pages;
      if (!pages) return null;

      const page = Object.values(pages)[0];
      if (!page || !page.pageid || !page.original) return null;

      return {
        url: page.original.source,
        source: 'wikipedia',
        title: page.title || title,
        width: page.original.width,
        height: page.original.height,
      };
    } catch (error) {
      console.warn(`[wikipedia-images] Failed to get page image for "${title}":`, error);
      return null;
    }
  }

  async function searchCommonsForChef(chefName: string): Promise<WikipediaImageResult | null> {
    try {
      const searchTerms = [
        chefName,
        `${chefName} chef`,
        `${chefName} cook`,
      ];

      for (const term of searchTerms) {
        const result = await searchCommonsImages(term);
        if (result) {
          return result;
        }
      }

      return null;
    } catch (error) {
      console.warn(`[wikipedia-images] Failed to search Commons for "${chefName}":`, error);
      return null;
    }
  }

  async function searchCommonsImages(query: string): Promise<WikipediaImageResult | null> {
    const searchResult = await fetchApi(COMMONS_API_BASE, {
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '5',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
    }) as {
      query?: {
        pages?: Record<string, {
          title?: string;
          imageinfo?: Array<{
            url: string;
            width: number;
            height: number;
            extmetadata?: {
              LicenseShortName?: { value: string };
            };
          }>;
        }>;
      };
    };

    const pages = searchResult.query?.pages;
    if (!pages) return null;

    for (const page of Object.values(pages)) {
      if (!page.imageinfo || page.imageinfo.length === 0) continue;

      const imageInfo = page.imageinfo[0];
      const title = page.title || '';
      
      if (isLikelyPersonPhoto(title, imageInfo.width, imageInfo.height)) {
        return {
          url: imageInfo.url,
          source: 'commons',
          title: title,
          width: imageInfo.width,
          height: imageInfo.height,
          license: imageInfo.extmetadata?.LicenseShortName?.value,
        };
      }
    }

    return null;
  }

  async function getWikipediaArticleExists(name: string): Promise<boolean> {
    try {
      const result = await fetchApi(WIKIMEDIA_API_BASE, {
        action: 'query',
        format: 'json',
        titles: name,
        redirects: '1',
      }) as {
        query?: {
          pages?: Record<string, { pageid?: number; missing?: boolean }>;
        };
      };

      const pages = result.query?.pages;
      if (!pages) return false;

      const page = Object.values(pages)[0];
      return !!(page && page.pageid && !page.missing);
    } catch {
      return false;
    }
  }

  return {
    getChefWikipediaImage,
    getWikipediaPageImage,
    searchCommonsForChef,
    getWikipediaArticleExists,
  };
}

function isLikelyPersonPhoto(title: string, width: number, height: number): boolean {
  const lowerTitle = title.toLowerCase();
  
  const badIndicators = [
    'logo', 'icon', 'banner', 'map', 'diagram', 'chart',
    'screenshot', 'flag', 'coat of arms', 'seal', 'emblem',
    // Artwork and venue shots that sit on otherwise-valid chef pages
    'painting', 'oil_on_canvas', 'portrait_of', 'sculpture', 'statue',
    'book_cover', 'album_cover', 'poster', 'exterior', 'storefront',
  ];
  
  if (badIndicators.some(indicator => lowerTitle.includes(indicator))) {
    return false;
  }

  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  if (minDimension < 100 || maxDimension < 150) {
    return false;
  }

  const aspectRatio = width / height;
  if (aspectRatio < 0.4 || aspectRatio > 2.5) {
    return false;
  }

  return true;
}

function isChefRelatedPage(
  categories: Array<{ title: string }> | undefined,
  extract: string | undefined,
  chefName: string,
  validationKeywords?: string[]
): boolean {
  const lowerExtract = extract?.toLowerCase() || '';
  const categoryText = categories?.map(c => c.title.toLowerCase()).join(' ') || '';
  const combinedText = `${lowerExtract} ${categoryText}`;

  // If validation keywords provided (show names, restaurant names), check for matches
  if (validationKeywords && validationKeywords.length > 0) {
    for (const keyword of validationKeywords) {
      if (keyword.length > 2 && combinedText.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }

  // Check for chef/culinary-related keywords
  const chefKeywords = [
    'chef', 'restaurateur', 'culinary', 'restaurant', 'cook',
    'top chef', 'iron chef', 'food network', 'cooking', 'cuisine',
    'contestant', 'competition', 'winner', 'james beard',
    // Food trades that rarely self-describe as "chef" on Wikipedia
    'butcher', 'baker', 'bakery', 'pastry', 'patisserie', 'sommelier',
    'gastronomy', 'michelin star',
  ];
  
  if (chefKeywords.some(keyword => combinedText.includes(keyword))) {
    return true;
  }

  // No culinary signal and no keyword match: reject. This previously fell through
  // to "any two-word name with a >100 char extract is fine", which accepted the
  // wrong same-name public figure (an actor, a radio host, a country singer) for
  // any chef lacking a Wikipedia page. A missing photo is cheap; someone else's
  // face on a chef's page is not.
  return false;
}

/** Strip diacritics and casing so "Albert Adrià" matches "Albert_Adri%C3%A0.jpg". */
function normalizeForMatch(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * A chef-related page can still lead with something that isn't the chef —
 * their restaurant's storefront, a group awards shot, or a museum portrait of a
 * same-named painter. Require the filename to carry part of their name.
 */
function imageDepictsPerson(imageUrl: string, chefName: string): boolean {
  const fileName = normalizeForMatch(
    decodeURIComponent(imageUrl.split('/').pop() || '')
  );

  // Artwork rather than photography — chef portraits are contemporary, so an
  // early-20th-century date is a reliable tell for a painting or engraving.
  if (/\b(1[0-8]\d{2}|19[0-5]\d)\b/.test(fileName)) return false;

  const nameTokens = normalizeForMatch(chefName)
    .split(/\s+/)
    .filter(token => token.length > 2);

  return nameTokens.some(token => fileName.includes(token));
}

export type WikipediaImageService = ReturnType<typeof createWikipediaImageService>;

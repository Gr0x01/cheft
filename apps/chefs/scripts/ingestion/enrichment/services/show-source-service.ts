import { SupabaseClient } from '@supabase/supabase-js';

export interface ShowContestant {
  name: string;
  season: string;
  result: string;
  restaurant?: string;
  city?: string;
}

export interface ShowSourceCache {
  showSlug: string;
  wikipediaUrl: string | null;
  wikipediaContent: string | null;
  imdbUrl: string | null;
  contestants: ShowContestant[];
  fetchedAt: Date;
}

const WIKIPEDIA_SHOW_URLS: Record<string, string> = {
  'top-chef': 'https://en.wikipedia.org/wiki/Top_Chef',
  'top-chef-masters': 'https://en.wikipedia.org/wiki/Top_Chef_Masters',
  'tournament-of-champions': 'https://en.wikipedia.org/wiki/Tournament_of_Champions_(TV_series)',
  'iron-chef-america': 'https://en.wikipedia.org/wiki/Iron_Chef_America',
  'hells-kitchen': 'https://en.wikipedia.org/wiki/Hell%27s_Kitchen_(American_TV_series)',
  'masterchef': 'https://en.wikipedia.org/wiki/MasterChef_(American_TV_series)',
  'chopped': 'https://en.wikipedia.org/wiki/Chopped_(TV_series)',
  'the-bear': 'https://en.wikipedia.org/wiki/The_Bear_(TV_series)',
  'chefs-table': 'https://en.wikipedia.org/wiki/Chef%27s_Table',
};

export class ShowSourceService {
  constructor(private supabase: SupabaseClient) {}

  async getCachedSource(showSlug: string): Promise<ShowSourceCache | null> {
    const { data, error } = await this.supabase
      .from('show_source_cache')
      .select('*')
      .eq('show_slug', showSlug)
      .single();

    if (error || !data) return null;

    return {
      showSlug: data.show_slug,
      wikipediaUrl: data.wikipedia_url,
      wikipediaContent: data.wikipedia_content,
      imdbUrl: data.imdb_url,
      contestants: data.contestants_json || [],
      fetchedAt: new Date(data.fetched_at),
    };
  }

  async fetchAndCacheWikipedia(showSlug: string, seasonNumber?: string): Promise<ShowSourceCache> {
    console.log(`   📚 Fetching Wikipedia for ${showSlug}...`);

    const baseUrl = WIKIPEDIA_SHOW_URLS[showSlug];
    const url = seasonNumber && baseUrl
      ? `${baseUrl.replace('wiki/', 'wiki/')}_(season_${seasonNumber})`
      : baseUrl;

    if (!url) {
      console.log(`   ⚠️  No Wikipedia URL configured for ${showSlug}`);
      return this.createEmptyCache(showSlug);
    }

    const seasonUrls = await this.discoverSeasonUrls(showSlug, baseUrl);
    let allContent = '';
    const allContestants: ShowContestant[] = [];

    const urlsToFetch = seasonUrls.length > 0 ? seasonUrls : [baseUrl];

    for (const pageUrl of urlsToFetch) {
      try {
        const content = await this.fetchWikipediaContent(pageUrl);
        allContent += `\n\n=== ${pageUrl} ===\n${content}`;

        const contestants = this.parseContestantsFromContent(content, pageUrl);
        allContestants.push(...contestants);
      } catch (err) {
        console.log(`   ⚠️  Failed to fetch ${pageUrl}`);
      }
    }

    const cache: ShowSourceCache = {
      showSlug,
      wikipediaUrl: baseUrl,
      wikipediaContent: allContent,
      imdbUrl: null,
      contestants: allContestants,
      fetchedAt: new Date(),
    };

    await this.saveCache(cache);
    console.log(`   ✅ Cached ${allContestants.length} contestants from Wikipedia`);

    return cache;
  }

  private async discoverSeasonUrls(showSlug: string, baseUrl: string): Promise<string[]> {
    const seasonUrls: string[] = [];
    
    const knownSeasons: Record<string, number> = {
      'top-chef-masters': 5,
      'top-chef': 22,
      'tournament-of-champions': 5,
    };

    const numSeasons = knownSeasons[showSlug];
    if (numSeasons && baseUrl) {
      for (let i = 1; i <= numSeasons; i++) {
        seasonUrls.push(`${baseUrl}_season_${i}`);
      }
    }

    return seasonUrls;
  }

  private async fetchWikipediaContent(url: string): Promise<string> {
    const apiUrl = url.replace('wikipedia.org/wiki/', 'wikipedia.org/api/rest_v1/page/html/');
    
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CheftApp/1.0 (contact@cheft.app)',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikipedia fetch failed: ${response.status}`);
    }

    const html = await response.text();
    return this.htmlToText(html);
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private parseContestantsFromContent(content: string, url: string): ShowContestant[] {
    const contestants: ShowContestant[] = [];
    const seasonMatch = url.match(/season[_\s](\d+)/i);
    const season = seasonMatch ? seasonMatch[1] : '1';

    const chefPatterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–—]\s*([^,\n]+),?\s*\(([^)]+)\)/g,
      /([A-Z][a-z]+ [A-Z][a-z]+)\s+(?:from|of)\s+([^,\n]+)/g,
      /(?:Winner|Runner-up|Finalist)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
    ];

    for (const pattern of chefPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1]?.trim();
        if (name && name.length > 3 && name.length < 40) {
          const existing = contestants.find(c => c.name === name);
          if (!existing) {
            contestants.push({
              name,
              season,
              result: 'contestant',
              restaurant: match[2]?.trim(),
              city: match[3]?.trim(),
            });
          }
        }
      }
    }

    return contestants;
  }

  private async saveCache(cache: ShowSourceCache): Promise<void> {
    await this.supabase.from('show_source_cache').upsert({
      show_slug: cache.showSlug,
      wikipedia_url: cache.wikipediaUrl,
      wikipedia_content: cache.wikipediaContent,
      imdb_url: cache.imdbUrl,
      contestants_json: cache.contestants,
      fetched_at: cache.fetchedAt.toISOString(),
    });
  }

  private createEmptyCache(showSlug: string): ShowSourceCache {
    return {
      showSlug,
      wikipediaUrl: null,
      wikipediaContent: null,
      imdbUrl: null,
      contestants: [],
      fetchedAt: new Date(),
    };
  }

  async getOrFetchShowSource(showSlug: string): Promise<ShowSourceCache> {
    const cached = await this.getCachedSource(showSlug);
    if (cached) {
      console.log(`   📦 Using cached Wikipedia for ${showSlug} (${cached.contestants.length} contestants)`);
      return cached;
    }

    return this.fetchAndCacheWikipedia(showSlug);
  }

  buildContextForLLM(cache: ShowSourceCache, chefName: string): string {
    if (!cache.wikipediaContent) {
      return '';
    }

    const relevantContent = cache.wikipediaContent
      .split('\n')
      .filter(line => 
        line.toLowerCase().includes(chefName.toLowerCase().split(' ')[0]) ||
        line.includes('Season') ||
        line.includes('Winner') ||
        line.includes('contestant')
      )
      .slice(0, 50)
      .join('\n');

    return `Wikipedia context for ${cache.showSlug}:\n${relevantContent}`;
  }
}

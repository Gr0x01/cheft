import { chromium, Browser, Page } from 'playwright';
import { ShowConfig } from '../utils/validation';
import { generateChefSlug } from '../utils/slug';

export interface ScrapedContestant {
  name: string;
  slug: string;
  season: string | null;
  seasonName: string | null;
  result: 'winner' | 'finalist' | 'contestant' | null;
  hometown: string | null;
  sourceUrl: string;
}

export interface ScrapeResult {
  show: ShowConfig;
  contestants: ScrapedContestant[];
  scrapedAt: Date;
  errors: string[];
}

export function getWikipediaUrl(show: ShowConfig): string {
  return `https://en.wikipedia.org/wiki/${show.wikipedia_source}`;
}

async function scrapeTopChefContestants(page: Page, show: ShowConfig): Promise<ScrapedContestant[]> {
  const contestants: ScrapedContestant[] = [];
  const sourceUrl = getWikipediaUrl(show);

  const tables = await page.$$('table.wikitable');
  
  for (const table of tables) {
    const caption = await table.$('caption');
    const captionText = caption ? await caption.textContent() : null;
    
    const headerRow = await table.$('tr:first-child');
    if (!headerRow) continue;
    
    const headers = await headerRow.$$eval('th', ths => 
      ths.map(th => th.textContent?.toLowerCase().trim() || '')
    );
    
    const hasChefColumn = headers.some(h => 
      h.includes('chef') || h.includes('contestant') || h.includes('name')
    );
    const hasSeasonColumn = headers.some(h => h.includes('season'));
    
    if (!hasChefColumn) continue;
    
    const nameColIndex = headers.findIndex(h => 
      h.includes('chef') || h.includes('contestant') || h.includes('name')
    );
    const seasonColIndex = headers.findIndex(h => h.includes('season'));
    const hometownColIndex = headers.findIndex(h => 
      h.includes('hometown') || h.includes('residence') || h.includes('city')
    );
    const finishColIndex = headers.findIndex(h => 
      h.includes('finish') || h.includes('place') || h.includes('result') || h.includes('elimination')
    );
    
    const rows = await table.$$('tr:not(:first-child)');
    
    let currentSeason: string | null = null;
    let currentSeasonName: string | null = null;
    
    for (const row of rows) {
      const cells = await row.$$('td, th');
      if (cells.length === 0) continue;
      
      const firstCellText = await cells[0].textContent();
      if (firstCellText?.toLowerCase().includes('season') && cells.length < 3) {
        const seasonMatch = firstCellText.match(/season\s*(\d+)/i);
        if (seasonMatch) {
          currentSeason = `S${seasonMatch[1].padStart(2, '0')}`;
          const nameMatch = firstCellText.match(/:\s*(.+)$/);
          currentSeasonName = nameMatch ? nameMatch[1].trim() : null;
        }
        continue;
      }
      
      if (cells.length <= nameColIndex) continue;
      
      const nameCell = cells[nameColIndex];
      const rawName = await nameCell.textContent();
      if (!rawName) continue;
      
      const name = rawName
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
      
      if (!name || name.length < 2) continue;
      if (/^(season|winner|finalist|contestant|chef|name)$/i.test(name)) continue;
      if (/^\d+$/.test(name)) continue;
      
      let season = currentSeason;
      let seasonName = currentSeasonName;
      
      if (hasSeasonColumn && seasonColIndex >= 0 && cells.length > seasonColIndex) {
        const seasonText = await cells[seasonColIndex].textContent();
        if (seasonText) {
          const seasonMatch = seasonText.match(/(\d+)/);
          if (seasonMatch) {
            season = `S${seasonMatch[1].padStart(2, '0')}`;
          }
          const nameMatch = seasonText.match(/[:\-]\s*(.+)$/);
          if (nameMatch) {
            seasonName = nameMatch[1].trim();
          }
        }
      }
      
      let hometown: string | null = null;
      if (hometownColIndex >= 0 && cells.length > hometownColIndex) {
        const hometownText = await cells[hometownColIndex].textContent();
        if (hometownText) {
          hometown = hometownText.replace(/\[.*?\]/g, '').trim() || null;
        }
      }
      
      let result: 'winner' | 'finalist' | 'contestant' | null = 'contestant';
      if (finishColIndex >= 0 && cells.length > finishColIndex) {
        const finishText = await cells[finishColIndex].textContent();
        if (finishText) {
          const lower = finishText.toLowerCase();
          if (lower.includes('winner') || lower.includes('1st') || lower === '1') {
            result = 'winner';
          } else if (lower.includes('runner') || lower.includes('finalist') || lower.includes('2nd') || lower === '2') {
            result = 'finalist';
          }
        }
      }
      
      if (captionText?.toLowerCase().includes('winner')) {
        result = 'winner';
      }
      
      try {
        const slug = generateChefSlug(name);
        contestants.push({
          name,
          slug,
          season,
          seasonName,
          result,
          hometown,
          sourceUrl
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Skipped invalid name "${name}": ${msg}`);
      }
    }
  }
  
  return contestants;
}

async function scrapeGenericContestants(page: Page, show: ShowConfig): Promise<ScrapedContestant[]> {
  const contestants: ScrapedContestant[] = [];
  const sourceUrl = getWikipediaUrl(show);
  
  const tables = await page.$$('table.wikitable');
  
  for (const table of tables) {
    const headerRow = await table.$('tr:first-child');
    if (!headerRow) continue;
    
    const headers = await headerRow.$$eval('th', ths => 
      ths.map(th => th.textContent?.toLowerCase().trim() || '')
    );
    
    const nameColIndex = headers.findIndex(h => 
      h.includes('chef') || h.includes('contestant') || h.includes('name') || h.includes('competitor')
    );
    
    if (nameColIndex === -1) continue;
    
    const seasonColIndex = headers.findIndex(h => h.includes('season') || h.includes('series'));
    const finishColIndex = headers.findIndex(h => 
      h.includes('finish') || h.includes('place') || h.includes('result') || h.includes('status')
    );
    
    const rows = await table.$$('tr:not(:first-child)');
    
    for (const row of rows) {
      const cells = await row.$$('td');
      if (cells.length <= nameColIndex) continue;
      
      const rawName = await cells[nameColIndex].textContent();
      if (!rawName) continue;
      
      const name = rawName
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
      
      if (!name || name.length < 2) continue;
      
      let season: string | null = null;
      if (seasonColIndex >= 0 && cells.length > seasonColIndex) {
        const seasonText = await cells[seasonColIndex].textContent();
        const match = seasonText?.match(/(\d+)/);
        if (match) {
          season = `S${match[1].padStart(2, '0')}`;
        }
      }
      
      let result: 'winner' | 'finalist' | 'contestant' | null = 'contestant';
      if (finishColIndex >= 0 && cells.length > finishColIndex) {
        const finishText = await cells[finishColIndex].textContent();
        if (finishText) {
          const lower = finishText.toLowerCase();
          if (lower.includes('winner') || lower.includes('1st') || lower === '1') {
            result = 'winner';
          } else if (lower.includes('runner') || lower.includes('finalist') || lower.includes('2nd')) {
            result = 'finalist';
          }
        }
      }
      
      try {
        const slug = generateChefSlug(name);
        contestants.push({
          name,
          slug,
          season,
          seasonName: null,
          result,
          hometown: null,
          sourceUrl
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`   ⚠️  Skipped invalid name "${name}": ${msg}`);
      }
    }
  }
  
  return contestants;
}

function deduplicateContestants(contestants: ScrapedContestant[]): ScrapedContestant[] {
  const seen = new Map<string, ScrapedContestant>();
  const resultPriority = { winner: 3, finalist: 2, contestant: 1, null: 0 };
  
  for (const contestant of contestants) {
    const key = contestant.slug;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, contestant);
    } else {
      const existingPriority = resultPriority[existing.result ?? 'null'];
      const newPriority = resultPriority[contestant.result ?? 'null'];
      if (newPriority > existingPriority) {
        seen.set(key, contestant);
      }
    }
  }
  return Array.from(seen.values());
}

export async function scrapeWikipediaContestants(
  show: ShowConfig,
  existingBrowser?: Browser
): Promise<ScrapeResult> {
  const result: ScrapeResult = {
    show,
    contestants: [],
    scrapedAt: new Date(),
    errors: []
  };
  
  const ownsBrowser = !existingBrowser;
  let browser: Browser | null = existingBrowser || null;
  
  try {
    if (!browser) {
      browser = await chromium.launch({ headless: true });
    }
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    const url = getWikipediaUrl(show);
    console.log(`   Fetching: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    if (show.slug === 'top-chef') {
      result.contestants = await scrapeTopChefContestants(page, show);
    } else {
      result.contestants = await scrapeGenericContestants(page, show);
    }
    
    result.contestants = deduplicateContestants(result.contestants);
    
    console.log(`   Found ${result.contestants.length} unique contestants`);
    
    await context.close();
    
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    console.error(`   ❌ Scrape error: ${msg}`);
  } finally {
    if (ownsBrowser && browser) {
      await browser.close();
    }
  }
  
  return result;
}

export async function scrapeAllEnabledShows(shows: ShowConfig[]): Promise<ScrapeResult[]> {
  const results: ScrapeResult[] = [];
  
  if (shows.length === 0) return results;
  
  let browser: Browser | null = null;
  
  try {
    browser = await chromium.launch({ headless: true });
    
    for (const show of shows) {
      console.log(`\n📺 Scraping: ${show.name}`);
      const result = await scrapeWikipediaContestants(show, browser);
      results.push(result);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return results;
}

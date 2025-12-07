import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ChefsTableEpisode {
  chefName: string;
  restaurant: string | null;
  city: string | null;
  country: string;
  series: string;
  volume: number | null;
  episode: number;
}

const SHOW_SLUG_MAP: Record<string, string> = {
  'main': 'chefs-table',
  'france': 'chefs-table-france',
  'pastry': 'chefs-table-pastry',
  'bbq': 'chefs-table-bbq',
  'pizza': 'chefs-table-pizza',
  'noodles': 'chefs-table-noodles',
  'legends': 'chefs-table-legends',
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function fetchWikipediaPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TVChefMap/1.0 (https://tvchefmap.com; contact@tvchefmap.com) Node.js',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.text();
}

function detectSeriesFromText(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes('france')) return 'france';
  if (lower.includes('pastry')) return 'pastry';
  if (lower.includes('bbq')) return 'bbq';
  if (lower.includes('pizza')) return 'pizza';
  if (lower.includes('noodles')) return 'noodles';
  if (lower.includes('legends')) return 'legends';
  return null;
}

function extractChefsFromHTML(html: string): ChefsTableEpisode[] {
  const episodes: ChefsTableEpisode[] = [];
  
  const tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi) || [];
  
  const allHeaders: { index: number; text: string; level: number }[] = [];
  
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h3Regex = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  
  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    allHeaders.push({ index: match.index, text: match[0].replace(/<[^>]+>/g, '').trim(), level: 2 });
  }
  while ((match = h3Regex.exec(html)) !== null) {
    allHeaders.push({ index: match.index, text: match[0].replace(/<[^>]+>/g, '').trim(), level: 3 });
  }
  
  allHeaders.sort((a, b) => a.index - b.index);
  
  for (const table of tables) {
    const tableIndex = html.indexOf(table);
    
    let currentSeries = 'main';
    let currentVolume: number | null = null;
    
    for (const header of allHeaders) {
      if (header.index > tableIndex) break;
      
      const series = detectSeriesFromText(header.text);
      if (series) {
        currentSeries = series;
        currentVolume = null;
      }
      
      const volumeMatch = header.text.match(/volume\s*(\d+)/i);
      if (volumeMatch) {
        currentVolume = parseInt(volumeMatch[1]);
        if (!series && header.text.toLowerCase().includes('pastry')) {
          currentSeries = 'pastry';
        }
      }
    }
    
    const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rows.length < 2) continue;
    
    const headerRow = rows[0];
    const headerCells = headerRow.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
    const headers = headerCells.map(h => h.replace(/<[^>]+>/g, '').trim().toLowerCase());
    
    const chefIdx = headers.findIndex(h => h.includes('chef') || h.includes('name') || h === 'featured');
    const restaurantIdx = headers.findIndex(h => h.includes('restaurant') || h.includes('establishment'));
    const locationIdx = headers.findIndex(h => h.includes('location') || h.includes('city') || h.includes('country'));
    const episodeIdx = headers.findIndex(h => h.includes('episode') || h.includes('ep') || h.includes('no'));
    
    if (chefIdx === -1) continue;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cellMatches = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const cells = cellMatches.map(c => {
        let text = c.replace(/<[^>]+>/g, ' ').trim();
        text = text.replace(/&#91;\d+&#93;/g, '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
        return text;
      });
      
      if (cells.length === 0) continue;
      
      const chefName = cells[chefIdx]?.trim();
      if (!chefName || chefName.length < 2) continue;
      if (['chef', 'name', 'featured', 'episode'].includes(chefName.toLowerCase())) continue;
      
      let restaurant: string | null = null;
      let city: string | null = null;
      let country = 'USA';
      
      if (restaurantIdx !== -1 && cells[restaurantIdx]) {
        const restCell = cells[restaurantIdx].trim();
        const inMatch = restCell.match(/^(.+?)\s+in\s+(.+)$/i);
        if (inMatch) {
          restaurant = inMatch[1].trim();
          const locationPart = inMatch[2].trim();
          const commaIdx = locationPart.lastIndexOf(',');
          if (commaIdx !== -1) {
            city = locationPart.substring(0, commaIdx).split(',')[0].trim();
            country = locationPart.substring(commaIdx + 1).trim();
          } else {
            city = locationPart;
          }
        } else {
          restaurant = restCell || null;
        }
      }
      
      if (!city && locationIdx !== -1 && cells[locationIdx]) {
        const location = cells[locationIdx].trim();
        const commaIdx = location.lastIndexOf(',');
        if (commaIdx !== -1) {
          city = location.substring(0, commaIdx).split(',')[0].trim();
          country = location.substring(commaIdx + 1).trim();
        } else {
          city = location;
        }
      }
      
      let episode = i;
      if (episodeIdx !== -1 && cells[episodeIdx]) {
        const epNum = parseInt(cells[episodeIdx]);
        if (!isNaN(epNum)) episode = epNum;
      }
      
      episodes.push({
        chefName,
        restaurant,
        city,
        country,
        series: currentSeries,
        volume: currentVolume,
        episode,
      });
    }
  }
  
  return episodes;
}

async function getOrCreateChef(name: string): Promise<string> {
  const slug = generateSlug(name);
  
  const { data: existing } = await supabase
    .from('chefs')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (existing) return existing.id;
  
  const { data: created, error } = await supabase
    .from('chefs')
    .insert({ name, slug })
    .select('id')
    .single();
  
  if (error) throw new Error(`Failed to create chef ${name}: ${error.message}`);
  return created.id;
}

async function getShowId(slug: string): Promise<string> {
  const { data, error } = await supabase
    .from('shows')
    .select('id')
    .eq('slug', slug)
    .single();
  
  if (error || !data) throw new Error(`Show not found: ${slug}`);
  return data.id;
}

async function createChefShow(chefId: string, showId: string, volume: number | null): Promise<void> {
  const season = volume ? `Volume ${volume}` : null;
  
  const { error } = await supabase
    .from('chef_shows')
    .upsert(
      { chef_id: chefId, show_id: showId, season, result: 'contestant' },
      { onConflict: 'chef_id,show_id,season' }
    );
  
  if (error) {
    console.error(`  Failed to link chef show: ${error.message}`);
  }
}

async function main() {
  console.log("Chef's Table Wikipedia Import");
  console.log('==============================\n');
  
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('[DRY RUN MODE]\n');
  
  console.log('Fetching Wikipedia page...');
  const html = await fetchWikipediaPage('https://en.wikipedia.org/wiki/Chef%27s_Table');
  
  console.log('Extracting chef data...\n');
  const episodes = extractChefsFromHTML(html);
  
  console.log(`Found ${episodes.length} episodes:\n`);
  
  const bySeries = new Map<string, ChefsTableEpisode[]>();
  for (const ep of episodes) {
    const key = ep.series;
    if (!bySeries.has(key)) bySeries.set(key, []);
    bySeries.get(key)!.push(ep);
  }
  
  for (const [series, eps] of bySeries) {
    console.log(`  ${series}: ${eps.length} episodes`);
  }
  
  if (dryRun) {
    console.log('\n[DRY RUN] Sample data:');
    for (const ep of episodes.slice(0, 10)) {
      console.log(`  - ${ep.chefName} (${ep.series} Vol ${ep.volume}): ${ep.restaurant || 'N/A'}, ${ep.city || ep.country}`);
    }
    return;
  }
  
  console.log('\nImporting to database...\n');
  
  const showIdCache = new Map<string, string>();
  for (const slug of Object.values(SHOW_SLUG_MAP)) {
    try {
      showIdCache.set(slug, await getShowId(slug));
    } catch {
      console.log(`  Warning: Show ${slug} not found - run migration first`);
    }
  }
  
  let created = 0;
  let linked = 0;
  
  for (const ep of episodes) {
    const showSlug = SHOW_SLUG_MAP[ep.series];
    const showId = showIdCache.get(showSlug);
    if (!showId) continue;
    
    try {
      const chefId = await getOrCreateChef(ep.chefName);
      await createChefShow(chefId, showId, ep.volume);
      
      process.stdout.write('.');
      linked++;
    } catch (err) {
      console.error(`\n  Error with ${ep.chefName}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }
  
  console.log(`\n\nDone! Linked ${linked} chef-show records.`);
  console.log('Run LLM enrichment to fill in bios, restaurants, and photos.');
}

main().catch(console.error);

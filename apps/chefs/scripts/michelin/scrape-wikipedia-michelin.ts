import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface MichelinRestaurant {
  name: string;
  city: string;
  state: string;
  country: string;
  stars: number;
  cuisine?: string;
  wikipedia_url: string;
}

const WIKIPEDIA_PAGES: { url: string; state: string; country: string; defaultCity?: string }[] = [
  // USA
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_California', state: 'California', country: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_New_York_City', state: 'New York', country: 'USA', defaultCity: 'New York' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Chicago', state: 'Illinois', country: 'USA', defaultCity: 'Chicago' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Washington,_D.C.', state: 'District of Columbia', country: 'USA', defaultCity: 'Washington' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Florida', state: 'Florida', country: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Colorado', state: 'Colorado', country: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Texas', state: 'Texas', country: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Las_Vegas', state: 'Nevada', country: 'USA', defaultCity: 'Las Vegas' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_the_American_South', state: '', country: 'USA' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_American_Northeast_Cities', state: '', country: 'USA' },
  // Canada
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Toronto', state: 'Ontario', country: 'Canada', defaultCity: 'Toronto' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Vancouver', state: 'British Columbia', country: 'Canada', defaultCity: 'Vancouver' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Quebec', state: 'Quebec', country: 'Canada' },
  // UK & Ireland
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Greater_London', state: 'England', country: 'UK', defaultCity: 'London' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_England', state: 'England', country: 'UK' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Scotland', state: 'Scotland', country: 'UK' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Wales', state: 'Wales', country: 'UK' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Ireland', state: '', country: 'Ireland' },
  // France
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Paris', state: 'Île-de-France', country: 'France', defaultCity: 'Paris' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_France', state: '', country: 'France' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Monaco', state: '', country: 'Monaco', defaultCity: 'Monaco' },
  // Germany, Austria, Switzerland
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Germany', state: '', country: 'Germany' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Austria', state: '', country: 'Austria' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Switzerland', state: '', country: 'Switzerland' },
  // Benelux
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Belgium_and_Luxembourg', state: '', country: 'Belgium' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_the_Netherlands', state: '', country: 'Netherlands' },
  // Nordic
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Denmark', state: '', country: 'Denmark' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Sweden', state: '', country: 'Sweden' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Norway', state: '', country: 'Norway' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Finland', state: '', country: 'Finland' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Iceland', state: '', country: 'Iceland' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Estonia', state: '', country: 'Estonia' },
  // Southern Europe
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Spain', state: '', country: 'Spain' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Portugal', state: '', country: 'Portugal' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Italy', state: '', country: 'Italy' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Greece', state: '', country: 'Greece' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Croatia', state: '', country: 'Croatia' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Slovenia', state: '', country: 'Slovenia' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Malta', state: '', country: 'Malta' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Turkey', state: '', country: 'Turkey' },
  // Eastern Europe
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Poland', state: '', country: 'Poland' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_the_Czech_Republic', state: '', country: 'Czech Republic' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Hungary', state: '', country: 'Hungary' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Serbia', state: '', country: 'Serbia' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Latvia', state: '', country: 'Latvia' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Lithuania', state: '', country: 'Lithuania' },
  // Asia
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Japan', state: '', country: 'Japan' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_South_Korea', state: '', country: 'South Korea' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Hong_Kong_and_Macau', state: '', country: 'Hong Kong' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Singapore', state: '', country: 'Singapore', defaultCity: 'Singapore' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Thailand', state: '', country: 'Thailand' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Taiwan', state: '', country: 'Taiwan' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Malaysia', state: '', country: 'Malaysia' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Vietnam', state: '', country: 'Vietnam' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_the_Philippines', state: '', country: 'Philippines' },
  // China
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Shanghai', state: '', country: 'China', defaultCity: 'Shanghai' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Beijing', state: '', country: 'China', defaultCity: 'Beijing' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Guangzhou', state: '', country: 'China', defaultCity: 'Guangzhou' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Hangzhou', state: '', country: 'China', defaultCity: 'Hangzhou' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Chengdu', state: '', country: 'China', defaultCity: 'Chengdu' },
  // Middle East
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Dubai', state: '', country: 'UAE', defaultCity: 'Dubai' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Abu_Dhabi', state: '', country: 'UAE', defaultCity: 'Abu Dhabi' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Doha', state: '', country: 'Qatar', defaultCity: 'Doha' },
  // Americas
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Mexico', state: '', country: 'Mexico' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Brazil', state: '', country: 'Brazil' },
  { url: 'https://en.wikipedia.org/wiki/List_of_Michelin-starred_restaurants_in_Argentina', state: '', country: 'Argentina' },
];

async function fetchWikipediaPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TVChefMap/1.0 (https://github.com/tvchefmap; contact@tvchefmap.com) Node.js',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });
  
  if (!response.ok) {
    throw new Error(`${response.status}`);
  }
  
  return response.text();
}

function getStarsFromRow(rowHtml: string): number {
  const starImages = rowHtml.match(/Etoile_Michelin-(\d)/gi) || [];
  if (starImages.length === 0) return 1;
  
  let maxStars = 1;
  for (const img of starImages) {
    const match = img.match(/Etoile_Michelin-(\d)/i);
    if (match) {
      const stars = parseInt(match[1]);
      if (stars > maxStars) maxStars = stars;
    }
  }
  
  return Math.min(maxStars, 3);
}

function extractRestaurantsFromHTML(html: string, state: string, country: string, defaultCity?: string): MichelinRestaurant[] {
  const restaurants: MichelinRestaurant[] = [];
  
  const tables = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi) || [];
  
  for (const table of tables) {
    if (table.toLowerCase().includes('>key<') || table.toLowerCase().includes('caption>key')) continue;
    
    const rows = table.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    if (rows.length < 2) continue;
    
    const headerRow = rows[0];
    const headerCells = headerRow.match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || [];
    const headers = headerCells.map(h => h.replace(/<[^>]+>/g, '').trim().toLowerCase());
    
    const nameIdx = headers.findIndex(h => h.includes('name') || h === 'restaurant');
    const cuisineIdx = headers.findIndex(h => h.includes('cuisine') || h.includes('type') || h.includes('style'));
    const locationIdx = headers.findIndex(h => h.includes('location') || h.includes('city') || h.includes('place') || h.includes('region'));
    
    if (nameIdx === -1) continue;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.toLowerCase().includes('closed')) continue;
      
      const stars = getStarsFromRow(row);
      
      const cellMatches = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      const cells = cellMatches.map(c => {
        let text = c.replace(/<[^>]+>/g, ' ').trim();
        text = text.replace(/&#91;\d+&#93;/g, '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
        return text;
      });
      
      if (cells.length === 0) continue;
      
      const name = cells[nameIdx]?.trim();
      if (!name || name.length < 2) continue;
      if (['name', 'restaurant', 'year'].includes(name.toLowerCase())) continue;
      
      let city = defaultCity || '';
      if (locationIdx !== -1 && cells[locationIdx]) {
        city = cells[locationIdx].split('–')[0].split(',')[0].trim();
      }
      
      const cuisine = cuisineIdx !== -1 ? cells[cuisineIdx]?.trim() : undefined;
      
      const existing = restaurants.find(r => 
        r.name.toLowerCase() === name.toLowerCase() && 
        r.city.toLowerCase() === city.toLowerCase()
      );
      
      if (!existing) {
        restaurants.push({
          name,
          city: city || 'Unknown',
          state,
          country,
          stars,
          cuisine: cuisine || undefined,
          wikipedia_url: '',
        });
      }
    }
  }
  
  return restaurants;
}

async function upsertMichelinRestaurants(restaurants: MichelinRestaurant[]): Promise<number> {
  let upsertedCount = 0;
  const batchSize = 50;
  
  for (let i = 0; i < restaurants.length; i += batchSize) {
    const batch = restaurants.slice(i, i + batchSize);
    const records = batch.map(r => ({
      name: r.name,
      city: r.city,
      state: r.state,
      country: r.country,
      stars: r.stars,
      cuisine: r.cuisine,
      wikipedia_url: r.wikipedia_url,
      last_verified: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('michelin_restaurants')
      .upsert(records, { onConflict: 'name,city' });
    
    if (error) {
      console.error(`  Batch error: ${error.message}`);
    } else {
      upsertedCount += batch.length;
    }
  }
  
  return upsertedCount;
}

async function main() {
  console.log('Michelin Wikipedia Scraper (Worldwide)');
  console.log('======================================\n');
  
  const allRestaurants: MichelinRestaurant[] = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const page of WIKIPEDIA_PAGES) {
    const label = page.defaultCity || page.state || page.country;
    process.stdout.write(`${label}... `);
    
    try {
      const html = await fetchWikipediaPage(page.url);
      const restaurants = extractRestaurantsFromHTML(html, page.state, page.country, page.defaultCity);
      restaurants.forEach(r => r.wikipedia_url = page.url);
      
      const stars3 = restaurants.filter(r => r.stars === 3).length;
      const stars2 = restaurants.filter(r => r.stars === 2).length;
      const stars1 = restaurants.filter(r => r.stars === 1).length;
      console.log(`${restaurants.length} (★★★:${stars3} ★★:${stars2} ★:${stars1})`);
      
      allRestaurants.push(...restaurants);
      successCount++;
      
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`ERROR: ${error instanceof Error ? error.message : 'Unknown'}`);
      errorCount++;
    }
  }
  
  const unique = new Map<string, MichelinRestaurant>();
  for (const r of allRestaurants) {
    const key = `${r.name.toLowerCase()}|${r.city.toLowerCase()}`;
    const existing = unique.get(key);
    if (!existing || r.stars > existing.stars) {
      unique.set(key, r);
    }
  }
  const deduped = Array.from(unique.values());
  
  console.log(`\n======================================`);
  console.log(`Pages: ${successCount} success, ${errorCount} errors`);
  console.log(`Total: ${deduped.length} restaurants (from ${allRestaurants.length})`);
  
  const byStars = { 3: 0, 2: 0, 1: 0 };
  deduped.forEach(r => byStars[r.stars as 1|2|3]++);
  console.log(`  ★★★ ${byStars[3]} | ★★ ${byStars[2]} | ★ ${byStars[1]}`);
  
  if (process.argv.includes('--dry-run')) {
    console.log('\n[DRY RUN] Not saving to database');
    return;
  }
  
  console.log('\nUpserting to database...');
  const upsertedCount = await upsertMichelinRestaurants(deduped);
  console.log(`Upserted ${upsertedCount} restaurants`);
  
  console.log('\nSyncing to restaurants table...');
  const { data: syncResult, error: syncError } = await supabase.rpc('sync_all_michelin_stars');
  
  if (syncError) {
    console.error(`Sync error: ${syncError.message}`);
  } else if (syncResult && syncResult.length > 0) {
    console.log(`Matched ${syncResult.length} restaurants:`);
    syncResult.forEach((m: any) => console.log(`  ${'★'.repeat(m.stars)} ${m.restaurant_name} (${m.city})`));
  } else {
    console.log('No new matches found');
  }
  
  console.log('\nDone!');
}

main().catch(console.error);

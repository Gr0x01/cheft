import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import OpenAI from 'openai';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

interface RawTopChefEntry {
  restaurant: string;
  chef: string;
  seasons: string;
  country: string;
  state?: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  jamesBeard?: boolean | string;
}

interface ParsedSeason {
  season: string;
  seasonName: string;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function parseChefName(rawName: string): string {
  return rawName.replace(/\s*\(\d+\)\s*$/, '').trim();
}

function parseSeason(rawSeason: string): ParsedSeason {
  const match = rawSeason.match(/Season\s+(\d+)\s*(?:\(([^)]+)\))?/i);
  if (match) {
    return {
      season: `S${match[1].padStart(2, '0')}`,
      seasonName: match[2] || ''
    };
  }
  return { season: rawSeason, seasonName: '' };
}

type JamesBeardStatus = 'semifinalist' | 'nominated' | 'winner' | null;

function parseJamesBeardStatus(value: boolean | string | undefined): JamesBeardStatus {
  if (!value) return null;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower.includes('winner')) return 'winner';
    if (lower.includes('nominated')) return 'nominated';
    if (lower.includes('semifinalist')) return 'semifinalist';
  }
  return null;
}

function getBetterJamesBeardStatus(current: JamesBeardStatus, incoming: JamesBeardStatus): JamesBeardStatus {
  const rank: Record<string, number> = { winner: 3, nominated: 2, semifinalist: 1 };
  const currentRank = current ? rank[current] || 0 : 0;
  const incomingRank = incoming ? rank[incoming] || 0 : 0;
  return incomingRank > currentRank ? incoming : current;
}

function inferPriceTier(restaurant: string, jamesBeardStatus: JamesBeardStatus): string {
  if (jamesBeardStatus) return '$$$';
  
  const text = restaurant.toLowerCase();
  const lowKeywords = ['food truck', 'counter', 'casual', 'deli', 'sandwich', 'taco', 'pizza'];
  const highKeywords = ['fine dining', 'tasting menu', 'omakase', 'prix fixe'];
  
  if (lowKeywords.some(keyword => text.includes(keyword))) return '$';
  if (highKeywords.some(keyword => text.includes(keyword))) return '$$$$';
  
  return '$$';
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!openai) return null;
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

function buildEmbeddingText(
  restaurantName: string,
  chefName: string,
  city: string,
  state: string | null,
  season: string,
  seasonName: string
): string {
  const location = state ? `${city}, ${state}` : city;
  return `${restaurantName} by ${chefName} in ${location}. Chef appeared on Top Chef ${season}${seasonName ? ` (${seasonName})` : ''}.`;
}

async function importTopChefDataV2() {
  try {
    console.log('📁 Loading raw Top Chef data...');
    
    const rawDataPath = join(__dirname, '../data/topchef-raw.json');
    const rawData: RawTopChefEntry[] = JSON.parse(
      readFileSync(rawDataPath, 'utf-8')
    );
    
    console.log(`📊 Processing ${rawData.length} restaurant entries...`);
    
    const { data: topChefShow, error: showError } = await supabase
      .from('shows')
      .select()
      .eq('slug', 'top-chef')
      .single();
    
    if (showError || !topChefShow) {
      throw new Error(`Top Chef show not found. Run migration first: ${showError?.message}`);
    }
    
    console.log(`📺 Top Chef show ID: ${topChefShow.id}`);
    
    console.log('👨‍🍳 Processing chefs...');
    const chefMap = new Map<string, {
      name: string;
      slug: string;
      jamesBeardStatus: JamesBeardStatus;
      country: string;
      seasons: ParsedSeason[];
    }>();
    
    for (const entry of rawData) {
      if (!entry.chef) continue;
      
      const cleanName = parseChefName(entry.chef);
      const chefSlug = generateSlug(cleanName);
      const parsedSeason = parseSeason(entry.seasons);
      
      const jamesBeardStatus = parseJamesBeardStatus(entry.jamesBeard);
      
      if (!chefMap.has(chefSlug)) {
        chefMap.set(chefSlug, {
          name: cleanName,
          slug: chefSlug,
          jamesBeardStatus,
          country: entry.country === 'USA' ? 'US' : entry.country,
          seasons: [parsedSeason]
        });
      } else {
        const existing = chefMap.get(chefSlug)!;
        if (!existing.seasons.some(s => s.season === parsedSeason.season)) {
          existing.seasons.push(parsedSeason);
        }
        // Upgrade status if better (winner > nominated > semifinalist)
        if (jamesBeardStatus) {
          existing.jamesBeardStatus = getBetterJamesBeardStatus(existing.jamesBeardStatus, jamesBeardStatus);
        }
      }
    }
    
    const chefsToInsert = Array.from(chefMap.values()).map(c => ({
      name: c.name,
      slug: c.slug,
      james_beard_status: c.jamesBeardStatus,
      country: c.country
    }));
    
    console.log(`📥 Inserting ${chefsToInsert.length} chefs...`);
    
    const { data: insertedChefs, error: chefsError } = await supabase
      .from('chefs')
      .insert(chefsToInsert)
      .select();
    
    if (chefsError) {
      throw new Error(`Failed to insert chefs: ${chefsError.message}`);
    }
    
    console.log(`✅ Inserted ${insertedChefs.length} chefs`);
    
    const chefLookup = new Map<string, string>();
    insertedChefs.forEach(chef => {
      chefLookup.set(chef.slug, chef.id);
    });
    
    console.log('🔗 Creating chef-show relationships...');
    const chefShowsToInsert: any[] = [];
    
    for (const [slug, chefData] of chefMap) {
      const chefId = chefLookup.get(slug);
      if (!chefId) continue;
      
      for (let i = 0; i < chefData.seasons.length; i++) {
        const s = chefData.seasons[i];
        chefShowsToInsert.push({
          chef_id: chefId,
          show_id: topChefShow.id,
          season: s.season,
          season_name: s.seasonName || null,
          result: 'contestant',
          is_primary: i === 0
        });
      }
    }
    
    const { error: chefShowsError } = await supabase
      .from('chef_shows')
      .insert(chefShowsToInsert);
    
    if (chefShowsError) {
      throw new Error(`Failed to insert chef_shows: ${chefShowsError.message}`);
    }
    
    console.log(`✅ Created ${chefShowsToInsert.length} chef-show relationships`);
    
    console.log('🏪 Processing restaurants...');
    const restaurants: any[] = [];
    const slugCounts = new Map<string, number>();
    
    for (const entry of rawData) {
      if (!entry.restaurant || !entry.chef) continue;
      
      const cleanChefName = parseChefName(entry.chef);
      const chefSlug = generateSlug(cleanChefName);
      const chefId = chefLookup.get(chefSlug);
      
      if (!chefId) {
        console.warn(`⚠️  Chef not found for restaurant: ${entry.restaurant}`);
        continue;
      }
      
      const baseSlug = generateSlug(`${entry.restaurant}-${entry.city}-${chefSlug}`);
      let finalSlug = baseSlug;
      
      if (slugCounts.has(baseSlug)) {
        const count = slugCounts.get(baseSlug)! + 1;
        slugCounts.set(baseSlug, count);
        finalSlug = `${baseSlug}-${count}`;
      } else {
        slugCounts.set(baseSlug, 0);
      }
      
      const parsedSeason = parseSeason(entry.seasons);
      
      restaurants.push({
        name: entry.restaurant,
        slug: finalSlug,
        chef_id: chefId,
        chef_role: 'owner',
        address: entry.address,
        city: entry.city,
        state: entry.state || null,
        country: entry.country === 'USA' ? 'US' : entry.country,
        lat: entry.lat,
        lng: entry.lng,
        price_tier: inferPriceTier(entry.restaurant, parseJamesBeardStatus(entry.jamesBeard)),
        cuisine_tags: [],
        status: 'unknown',
        website_url: entry.website || null,
        maps_url: `https://maps.google.com/?q=${entry.lat},${entry.lng}`,
        source_notes: `Imported from topchef.fyi on ${new Date().toISOString().split('T')[0]}`,
        is_public: true,
        _chef_name: cleanChefName,
        _season: parsedSeason.season,
        _season_name: parsedSeason.seasonName
      });
    }
    
    const restaurantsToInsert = restaurants.map(({ _chef_name, _season, _season_name, ...r }) => r);
    
    console.log(`📥 Inserting ${restaurantsToInsert.length} restaurants...`);
    
    const { data: insertedRestaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .insert(restaurantsToInsert)
      .select();
    
    if (restaurantsError) {
      throw new Error(`Failed to insert restaurants: ${restaurantsError.message}`);
    }
    
    console.log(`✅ Inserted ${insertedRestaurants.length} restaurants`);
    
    if (openai) {
      console.log('🧠 Generating embeddings...');
      const embeddings: any[] = [];
      
      for (let i = 0; i < insertedRestaurants.length; i++) {
        const r = insertedRestaurants[i];
        const original = restaurants[i];
        
        const text = buildEmbeddingText(
          r.name,
          original._chef_name,
          r.city,
          r.state,
          original._season,
          original._season_name
        );
        
        const embedding = await generateEmbedding(text);
        
        if (embedding) {
          embeddings.push({
            restaurant_id: r.id,
            embedding,
            text_content: text
          });
        }
        
        if ((i + 1) % 50 === 0) {
          console.log(`   Processed ${i + 1}/${insertedRestaurants.length} embeddings...`);
        }
      }
      
      if (embeddings.length > 0) {
        const { error: embeddingsError } = await supabase
          .from('restaurant_embeddings')
          .insert(embeddings);
        
        if (embeddingsError) {
          console.error(`⚠️  Failed to insert embeddings: ${embeddingsError.message}`);
        } else {
          console.log(`✅ Generated ${embeddings.length} embeddings`);
        }
      }
    } else {
      console.log('⏭️  Skipping embeddings (OPENAI_API_KEY not set)');
    }
    
    console.log('\n🎉 Import Summary:');
    console.log(`   Chefs: ${insertedChefs.length}`);
    console.log(`   Chef-Show links: ${chefShowsToInsert.length}`);
    console.log(`   Restaurants: ${insertedRestaurants.length}`);
    console.log(`   Cities: ${new Set(restaurants.map(r => `${r.city}, ${r.state || r.country}`)).size}`);
    console.log(`   States: ${new Set(restaurants.map(r => r.state).filter(Boolean)).size}`);
    
    console.log('\n📋 Sample imported restaurants:');
    insertedRestaurants.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name} (${r.city}, ${r.state})`);
    });
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    throw error;
  }
}

if (require.main === module) {
  importTopChefDataV2()
    .then(() => {
      console.log('🎉 Import complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

export { importTopChefDataV2 };

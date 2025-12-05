import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = "https://clktrvyieegouggrpfaj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RawTopChefEntry {
  restaurant: string;
  chef: string;
  seasons: string; // Actually a string, not an array
  country: string;
  state?: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  jamesBeard?: boolean;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function normalizeSeasons(seasons: string | string[]): string[] {
  // Handle both string and array inputs
  const seasonArray = Array.isArray(seasons) ? seasons : [seasons];
  
  return seasonArray
    .filter(Boolean)
    .map(season => {
      // Normalize season format to S## (e.g., "Season 4" -> "S04")
      const match = season.match(/(\d+)/);
      if (match) {
        return `S${match[1].padStart(2, '0')}`;
      }
      return season;
    });
}

function inferPriceTier(restaurant: string, chef: string, jamesBeard: boolean): string {
  // Simple heuristics for price tier
  if (jamesBeard) return '$$$';
  
  const lowKeywords = ['food truck', 'counter', 'casual', 'deli', 'sandwich'];
  const highKeywords = ['fine dining', 'tasting menu', 'omakase', 'prix fixe'];
  
  const text = `${restaurant} ${chef}`.toLowerCase();
  
  if (lowKeywords.some(keyword => text.includes(keyword))) {
    return '$';
  } else if (highKeywords.some(keyword => text.includes(keyword))) {
    return '$$$$';
  }
  
  return '$$'; // Default to mid-range
}

async function importTopChefData() {
  try {
    console.log('📁 Loading raw Top Chef data...');
    
    const rawDataPath = join(__dirname, '../data/topchef-raw.json');
    const rawData: RawTopChefEntry[] = JSON.parse(
      readFileSync(rawDataPath, 'utf-8')
    );
    
    console.log(`📊 Processing ${rawData.length} restaurant entries...`);
    
    // Step 1: Ensure Top Chef show exists
    console.log('📺 Setting up Top Chef show...');
    const { data: show, error: showError } = await supabase
      .from('shows')
      .upsert({
        name: 'Top Chef',
        network: 'Bravo'
      }, {
        onConflict: 'name'
      })
      .select()
      .single();
    
    if (showError) {
      throw new Error(`Failed to create show: ${showError.message}`);
    }
    
    console.log(`✅ Top Chef show ID: ${show.id}`);
    
    // Step 2: Process chefs
    console.log('👨‍🍳 Processing chefs...');
    const chefMap = new Map<string, any>();
    
    for (const entry of rawData) {
      if (!entry.chef) continue;
      
      const chefSlug = generateSlug(entry.chef);
      
      if (!chefMap.has(chefSlug)) {
        const normalizedSeasons = normalizeSeasons(entry.seasons || []);
        
        chefMap.set(chefSlug, {
          name: entry.chef,
          slug: chefSlug,
          primary_show_id: show.id,
          other_shows: [], // Will expand later with other shows
          top_chef_season: normalizedSeasons[0] || null,
          top_chef_result: 'contestant', // Will enrich later
          mini_bio: null, // Will enrich later
          country: entry.country || 'US'
        });
      } else {
        // Merge seasons if chef appears multiple times
        const existingChef = chefMap.get(chefSlug);
        const newSeasons = normalizeSeasons(entry.seasons || []);
        const allSeasons = [...new Set([existingChef.top_chef_season, ...newSeasons])];
        existingChef.top_chef_season = allSeasons.filter(Boolean)[0];
      }
    }
    
    // Insert chefs
    const chefs = Array.from(chefMap.values());
    console.log(`📥 Inserting ${chefs.length} chefs...`);
    
    const { data: insertedChefs, error: chefsError } = await supabase
      .from('chefs')
      .insert(chefs)
      .select();
    
    if (chefsError) {
      throw new Error(`Failed to insert chefs: ${chefsError.message}`);
    }
    
    console.log(`✅ Inserted ${insertedChefs.length} chefs`);
    
    // Create chef lookup map
    const chefLookup = new Map();
    insertedChefs.forEach(chef => {
      chefLookup.set(chef.slug, chef.id);
    });
    
    // Step 3: Process restaurants
    console.log('🏪 Processing restaurants...');
    const restaurants = [];
    const slugCounts = new Map<string, number>();
    
    for (const entry of rawData) {
      if (!entry.restaurant || !entry.chef) continue;
      
      const chefSlug = generateSlug(entry.chef);
      const chefId = chefLookup.get(chefSlug);
      
      if (!chefId) {
        console.warn(`⚠️  Chef not found for restaurant: ${entry.restaurant}`);
        continue;
      }
      
      // Create a base slug and ensure uniqueness
      const baseSlug = generateSlug(`${entry.restaurant}-${entry.city}-${chefSlug}`);
      let finalSlug = baseSlug;
      
      if (slugCounts.has(baseSlug)) {
        const count = slugCounts.get(baseSlug)! + 1;
        slugCounts.set(baseSlug, count);
        finalSlug = `${baseSlug}-${count}`;
      } else {
        slugCounts.set(baseSlug, 0);
      }
      
      const restaurant = {
        name: entry.restaurant,
        slug: finalSlug,
        chef_id: chefId,
        city: entry.city,
        state: entry.state || null,
        country: entry.country || 'US',
        lat: entry.lat,
        lng: entry.lng,
        price_tier: inferPriceTier(entry.restaurant, entry.chef, entry.jamesBeard || false),
        cuisine_tags: [], // Will enrich later
        status: 'unknown', // Will verify later
        website_url: entry.website || null,
        maps_url: `https://maps.google.com/?q=${entry.lat},${entry.lng}`,
        source_notes: `Imported from topchef.fyi on ${new Date().toISOString().split('T')[0]}`,
        is_public: true
      };
      
      restaurants.push(restaurant);
    }
    
    console.log(`📥 Inserting ${restaurants.length} restaurants...`);
    
    const { data: insertedRestaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .insert(restaurants)
      .select();
    
    if (restaurantsError) {
      throw new Error(`Failed to insert restaurants: ${restaurantsError.message}`);
    }
    
    console.log(`✅ Inserted ${insertedRestaurants.length} restaurants`);
    
    // Final summary
    console.log('\n🎉 Import Summary:');
    console.log(`   Shows: 1 (Top Chef)`);
    console.log(`   Chefs: ${insertedChefs.length}`);
    console.log(`   Restaurants: ${insertedRestaurants.length}`);
    console.log(`   Cities: ${new Set(restaurants.map(r => `${r.city}, ${r.state || r.country}`)).size}`);
    
    // Show some sample data
    console.log('\n📋 Sample imported restaurants:');
    insertedRestaurants.slice(0, 5).forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name} (${r.city}, ${r.state})`);
    });
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  importTopChefData()
    .then(() => {
      console.log('🎉 Import complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Import failed:', error);
      process.exit(1);
    });
}

export { importTopChefData };
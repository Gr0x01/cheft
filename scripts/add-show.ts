import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Contestant {
  name: string;
  season: string;
  result: string;
}

interface ShowConfig {
  showName: string;
  network: string;
  contestants: Contestant[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseArgs(): ShowConfig | null {
  const args = process.argv.slice(2);
  
  if (args.includes('--config')) {
    const configIndex = args.indexOf('--config');
    const configPath = args[configIndex + 1];
    if (!configPath) {
      console.error('Error: --config requires a path');
      return null;
    }
    try {
      const fs = require('fs');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config as ShowConfig;
    } catch (e) {
      console.error(`Error reading config file: ${e}`);
      return null;
    }
  }
  
  const showIndex = args.indexOf('--show');
  const networkIndex = args.indexOf('--network');
  const contestantsIndex = args.indexOf('--contestants');
  
  if (showIndex === -1) {
    console.error('Usage: npx tsx scripts/add-show.ts --show "Show Name" --network "Network" --contestants "Name:season:result,..."');
    console.error('   or: npx tsx scripts/add-show.ts --config path/to/config.json');
    return null;
  }
  
  const showName = args[showIndex + 1];
  const network = networkIndex !== -1 ? args[networkIndex + 1] : 'Unknown';
  const contestantsStr = contestantsIndex !== -1 ? args[contestantsIndex + 1] : '';
  
  const contestants: Contestant[] = contestantsStr.split(',').filter(Boolean).map(c => {
    const [name, season, result] = c.split(':');
    return { name: name.trim(), season: season?.trim() || '1', result: result?.trim() || 'contestant' };
  });
  
  return { showName, network, contestants };
}

async function ensureShowExists(showName: string, network: string): Promise<string | null> {
  const slug = slugify(showName);
  
  const { data: existing } = await supabase
    .from('shows')
    .select('id, is_public')
    .eq('slug', slug)
    .single();
  
  if (existing) {
    if (!existing.is_public) {
      await supabase.from('shows').update({ is_public: true }).eq('id', existing.id);
      console.log(`   📺 Made show public: ${showName}`);
    }
    return existing.id;
  }
  
  const { data: newShow, error } = await supabase
    .from('shows')
    .insert({ name: showName, slug, network, is_public: true })
    .select('id')
    .single();
  
  if (error) {
    console.error(`   ❌ Failed to create show: ${error.message}`);
    return null;
  }
  
  console.log(`   📺 Created new show: ${showName}`);
  return newShow.id;
}

async function generateShowSEO(enricher: ReturnType<typeof createLLMEnricher>, showId: string, showName: string, network: string) {
  console.log('\n📝 Generating show SEO...');
  
  const { data: show } = await supabase
    .from('shows')
    .select('description')
    .eq('id', showId)
    .single();
  
  if (!show?.description) {
    const result = await enricher.generateShowDescription(showId, showName, network);
    if (result.success) {
      console.log(`   ✅ Generated show description`);
    } else {
      console.log(`   ⚠️  Show description failed: ${result.error}`);
    }
  } else {
    console.log(`   ⏭️  Show description already exists`);
  }
}

async function generateSeasonSEO(enricher: ReturnType<typeof createLLMEnricher>, showId: string, showName: string, network: string) {
  console.log('\n📝 Generating season SEO...');
  
  const { data: chefShows } = await supabase
    .from('chef_shows')
    .select('season, result, chefs(id, name)')
    .eq('show_id', showId);
  
  if (!chefShows || chefShows.length === 0) {
    console.log('   ⏭️  No chef-show records found');
    return;
  }
  
  const seasons = [...new Set(chefShows.map(cs => cs.season).filter(Boolean))];
  
  const { data: show } = await supabase
    .from('shows')
    .select('season_descriptions')
    .eq('id', showId)
    .single();
  
  const existingDescriptions = show?.season_descriptions || {};
  
  for (const season of seasons) {
    if (existingDescriptions[season]) {
      console.log(`   ⏭️  Season ${season} description exists`);
      continue;
    }
    
    const seasonChefs = chefShows.filter(cs => cs.season === season);
    const winner = seasonChefs.find(cs => cs.result === 'winner');
    
    const { count: restaurantCount } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true })
      .in('chef_id', seasonChefs.map(cs => (cs.chefs as any)?.id).filter(Boolean));
    
    const result = await enricher.generateSeasonDescription(showId, season, {
      showName,
      season,
      network,
      winner: winner ? { name: (winner.chefs as any)?.name, chefId: (winner.chefs as any)?.id } : null,
      chefCount: seasonChefs.length,
      restaurantCount: restaurantCount || 0,
    });
    
    if (result.success) {
      console.log(`   ✅ Generated Season ${season} description`);
    } else {
      console.log(`   ⚠️  Season ${season} failed: ${result.error}`);
    }
  }
}

async function runGooglePlacesEnrichment() {
  console.log('\n🗺️  Running Google Places enrichment...');
  
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, city')
    .is('google_place_id', null)
    .eq('status', 'open')
    .limit(50);
  
  if (!restaurants || restaurants.length === 0) {
    console.log('   ✅ All restaurants have Google Place IDs');
    return;
  }
  
  console.log(`   Found ${restaurants.length} restaurants missing Place IDs`);
  console.log('   Run separately: npx tsx scripts/enrich-google-places.ts');
}

async function main() {
  const config = parseArgs();
  if (!config) {
    process.exit(1);
  }
  
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`📺 Adding Show: ${config.showName}`);
  console.log(`📡 Network: ${config.network}`);
  console.log(`👥 Contestants: ${config.contestants.length}`);
  console.log(`${'━'.repeat(60)}\n`);
  
  const showId = await ensureShowExists(config.showName, config.network);
  if (!showId) {
    console.error('Failed to create/find show');
    process.exit(1);
  }
  
  const enricher = createLLMEnricher(supabase, { model: 'gpt-4o-mini' });
  let totalCost = 0;
  let chefsAdded = 0;
  let chefsSkipped = 0;
  
  for (const contestant of config.contestants) {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`👤 Processing: ${contestant.name} (Season ${contestant.season}, ${contestant.result})`);
    console.log(`${'─'.repeat(50)}`);
    
    const slug = slugify(contestant.name);
    const { data: existing } = await supabase
      .from('chefs')
      .select('id')
      .eq('slug', slug)
      .single();
    
    if (existing) {
      console.log(`   ⏭️  Already exists, skipping enrichment`);
      
      const { data: hasShow } = await supabase
        .from('chef_shows')
        .select('id')
        .eq('chef_id', existing.id)
        .eq('show_id', showId)
        .single();
      
      if (!hasShow) {
        await supabase.from('chef_shows').insert({
          chef_id: existing.id,
          show_id: showId,
          season: contestant.season,
          result: contestant.result,
        });
        console.log(`   ✅ Linked to show`);
      }
      
      chefsSkipped++;
      continue;
    }
    
    const { data: newChef, error: insertError } = await supabase
      .from('chefs')
      .insert({ name: contestant.name, slug })
      .select('id')
      .single();
    
    if (insertError || !newChef) {
      console.error(`   ❌ Failed to create chef: ${insertError?.message}`);
      continue;
    }
    
    console.log(`   ✅ Created chef record`);
    
    try {
      const result = await enricher.workflows.manualChefAddition({
        chefId: newChef.id,
        chefName: contestant.name,
        initialShowName: config.showName,
        initialShowSeason: contestant.season,
        initialShowResult: contestant.result,
      });
      
      if (result.success) {
        console.log(`   ✅ Bio: ${result.bioCreated ? 'Yes' : 'No'}`);
        console.log(`   📺 Shows: ${result.totalShows}`);
        console.log(`   🍽️  Restaurants: ${result.totalRestaurants}`);
        chefsAdded++;
      } else {
        console.error(`   ❌ Enrichment failed: ${result.error}`);
      }
      
      totalCost += enricher.estimateCost();
      enricher.resetTokenCounter();
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
    }
  }
  
  await generateShowSEO(enricher, showId, config.showName, config.network);
  await generateSeasonSEO(enricher, showId, config.showName, config.network);
  await runGooglePlacesEnrichment();
  
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`✅ Done!`);
  console.log(`   Chefs added: ${chefsAdded}`);
  console.log(`   Chefs skipped: ${chefsSkipped}`);
  console.log(`   Estimated cost: $${totalCost.toFixed(2)}`);
  console.log(`${'━'.repeat(60)}\n`);
  
  console.log('Next steps:');
  console.log('  1. Run: npx tsx scripts/enrich-google-places.ts');
  console.log(`  2. Visit: /shows/${slugify(config.showName)}`);
}

main().catch(console.error);

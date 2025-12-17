/**
 * Enrich or re-enrich specific chefs by name
 * Usage: npx tsx scripts/enrich-chef.ts "Chef Name" "Another Chef"
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { ManualChefAdditionWorkflow } from './ingestion/enrichment/workflows/manual-chef-addition.workflow';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const chefNames = process.argv.slice(2);

  if (chefNames.length === 0) {
    console.error('Usage: npx tsx scripts/enrich-chef.ts "Chef Name" "Another Chef"');
    process.exit(1);
  }

  console.log(`\n${'━'.repeat(60)}`);
  console.log(`🧑‍🍳 Enriching ${chefNames.length} chef(s)`);
  console.log(`${'━'.repeat(60)}\n`);

  for (const name of chefNames) {
    console.log(`\n📝 Looking up: ${name}`);

    // Find chef by name
    const { data: chef, error } = await supabase
      .from('chefs')
      .select('id, name, chef_shows(show:shows(name), season, result, is_primary)')
      .ilike('name', name)
      .single();

    if (error || !chef) {
      console.log(`   ❌ Chef not found: ${name}`);
      continue;
    }

    // Get primary show info
    const primaryShow = (chef.chef_shows as any[])?.find((cs: any) => cs.is_primary);
    const showName = primaryShow?.show?.name || 'The Final Table';
    const season = primaryShow?.season || '1';
    const result = primaryShow?.result || 'contestant';

    console.log(`   Found: ${chef.name} (${chef.id})`);
    console.log(`   Primary show: ${showName} S${season} (${result})`);
    console.log(`   Starting enrichment...`);

    const workflow = new ManualChefAdditionWorkflow(supabase);

    try {
      const result2 = await workflow.execute({
        chefId: chef.id,
        chefName: chef.name,
        initialShowName: showName,
        initialShowSeason: season,
        initialShowResult: result,
      });

      if (result2.success && result2.output) {
        const output = result2.output;
        console.log(`   ✅ Done: bio=${output.bioCreated}, shows=${output.totalShows}, restaurants=${output.totalRestaurants}`);
      } else {
        console.log(`   ❌ Failed: ${result2.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.log(`   ❌ Failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n${'━'.repeat(60)}`);
  console.log(`✅ Enrichment complete`);
  console.log(`${'━'.repeat(60)}\n`);
}

main().catch(console.error);

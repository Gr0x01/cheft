#!/usr/bin/env tsx
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/lib/database.types';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

interface EnrichmentStats {
  total: number;
  processed: number;
  success: number;
  failed: number;
  alreadyHasHandle: number;
  totalCost: number;
}

async function enrichInstagramHandles(options: { limit?: number; test?: boolean } = {}) {
  const stats: EnrichmentStats = {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    alreadyHasHandle: 0,
    totalCost: 0,
  };

  console.log('\n🔍 Instagram Handle Enrichment');
  console.log('================================\n');

  const enricher = createLLMEnricher(supabase, {
    model: 'gpt-5-mini',
  });

  let query = supabase
    .from('chefs')
    .select('id, name, instagram_handle')
    .order('name');

  if (!options.test) {
    query = query.is('instagram_handle', null);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data: chefs, error } = await query;

  if (error || !chefs) {
    console.error('❌ Failed to fetch chefs:', error);
    process.exit(1);
  }

  stats.total = chefs.length;

  if (stats.total === 0) {
    console.log('✅ No chefs need Instagram enrichment!');
    return stats;
  }

  console.log(`Found ${stats.total} chef(s) to process\n`);

  if (options.test) {
    console.log('🧪 TEST MODE - Will process but show what would happen\n');
  }

  for (let i = 0; i < chefs.length; i++) {
    const chef = chefs[i];
    const progress = `[${i + 1}/${stats.total}]`;

    if (chef.instagram_handle) {
      console.log(`${progress} ⏭️  ${chef.name} - Already has handle: @${chef.instagram_handle}`);
      stats.alreadyHasHandle++;
      continue;
    }

    console.log(`${progress} 🔎 ${chef.name}...`);
    stats.processed++;

    const result = await enricher.enrichInstagramOnly(chef.id, chef.name);

    const tokenCost = (result.tokensUsed.prompt / 1_000_000) * 0.25 +
                      (result.tokensUsed.completion / 1_000_000) * 2.00;
    stats.totalCost += tokenCost;

    if (result.success && result.instagramHandle) {
      console.log(`   ✅ Found: @${result.instagramHandle} ($${tokenCost.toFixed(4)})`);
      
      if (!options.test) {
        const { error: updateError } = await supabase
          .from('chefs')
          .update({
            instagram_handle: result.instagramHandle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', chef.id);

        if (updateError) {
          console.error(`   ❌ Failed to save: ${updateError.message}`);
          stats.failed++;
        } else {
          stats.success++;
        }
      } else {
        console.log(`   🧪 TEST MODE - Would save: @${result.instagramHandle}`);
        stats.success++;
      }
    } else {
      console.log(`   ⚠️  Not found ($${tokenCost.toFixed(4)})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      stats.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n================================');
  console.log('📊 Enrichment Complete\n');
  console.log(`Total chefs: ${stats.total}`);
  console.log(`Already had handle: ${stats.alreadyHasHandle}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`✅ Success: ${stats.success}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`💰 Total cost: $${stats.totalCost.toFixed(2)}`);
  console.log(`💵 Avg cost/chef: $${stats.processed > 0 ? (stats.totalCost / stats.processed).toFixed(4) : '0.0000'}\n`);

  return stats;
}

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined;
const testMode = args.includes('--test');

enrichInstagramHandles({ limit, test: testMode })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

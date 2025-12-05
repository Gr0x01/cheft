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
  alreadyHasPost: number;
  lowConfidence: number;
  totalCost: number;
}

async function enrichInstagramPosts(options: { 
  limit?: number; 
  test?: boolean; 
  minConfidence?: number;
  autoSave?: boolean;
} = {}) {
  const stats: EnrichmentStats = {
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    alreadyHasPost: 0,
    lowConfidence: 0,
    totalCost: 0,
  };

  const minConfidence = options.minConfidence ?? 0.7;
  const autoSave = options.autoSave ?? true;

  console.log('\n📸 Instagram Post Enrichment');
  console.log('================================\n');
  console.log(`Min confidence threshold: ${minConfidence}`);
  console.log(`Auto-save mode: ${autoSave ? 'ON' : 'OFF (review only)'}\n`);

  const enricher = createLLMEnricher(supabase, {
    model: 'gpt-5-mini',
  });

  let query = supabase
    .from('chefs')
    .select('id, name, instagram_handle, featured_instagram_post')
    .not('instagram_handle', 'is', null)
    .order('name');

  if (!options.test) {
    query = query.is('featured_instagram_post', null);
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
    console.log('✅ No chefs need Instagram post enrichment!');
    return stats;
  }

  console.log(`Found ${stats.total} chef(s) to process\n`);

  if (options.test) {
    console.log('🧪 TEST MODE - Will show results without saving\n');
  }

  for (let i = 0; i < chefs.length; i++) {
    const chef = chefs[i];
    const progress = `[${i + 1}/${stats.total}]`;

    if (chef.featured_instagram_post && !options.test) {
      console.log(`${progress} ⏭️  ${chef.name} - Already has featured post`);
      stats.alreadyHasPost++;
      continue;
    }

    if (!chef.instagram_handle) {
      console.log(`${progress} ⚠️  ${chef.name} - No Instagram handle`);
      continue;
    }

    console.log(`${progress} 🔎 ${chef.name} (@${chef.instagram_handle})...`);
    stats.processed++;

    const result = await enricher.findInstagramPosts(
      chef.id,
      chef.name,
      chef.instagram_handle
    );

    const tokenCost = (result.tokensUsed.prompt / 1_000_000) * 0.25 +
                      (result.tokensUsed.completion / 1_000_000) * 2.00;
    stats.totalCost += tokenCost;

    if (result.success && result.posts.length > 0) {
      console.log(`   ✅ Found ${result.posts.length} posts ($${tokenCost.toFixed(4)})`);
      
      result.posts.forEach((post, idx) => {
        const emoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
        const confidenceColor = post.confidence >= 0.9 ? '🟢' : post.confidence >= 0.7 ? '🟡' : '🔴';
        console.log(`      ${emoji} ${confidenceColor} ${post.confidence.toFixed(2)} - ${post.reason}`);
        console.log(`         ${post.postUrl}`);
      });

      if (result.bestPost) {
        const shouldSave = autoSave && result.bestPost.confidence >= minConfidence;
        
        if (shouldSave && !options.test) {
          const { error: updateError } = await supabase
            .from('chefs')
            .update({
              featured_instagram_post: result.bestPost.postUrl,
              updated_at: new Date().toISOString(),
            })
            .eq('id', chef.id);

          if (updateError) {
            console.log(`   ❌ Failed to save: ${updateError.message}`);
            stats.failed++;
          } else {
            console.log(`   💾 SAVED: ${result.bestPost.postUrl}`);
            stats.success++;
          }
        } else if (result.bestPost.confidence < minConfidence) {
          console.log(`   ⚠️  SKIPPED: Confidence ${result.bestPost.confidence.toFixed(2)} < ${minConfidence} (manual review recommended)`);
          stats.lowConfidence++;
        } else if (options.test) {
          console.log(`   🧪 TEST MODE - Would save: ${result.bestPost.postUrl}`);
          stats.success++;
        } else if (!autoSave) {
          console.log(`   👀 REVIEW MODE - Best post ready for manual approval`);
          stats.success++;
        }
      }
    } else if (result.success) {
      console.log(`   ℹ️  No suitable posts found ($${tokenCost.toFixed(4)})`);
    } else {
      console.log(`   ❌ Error finding posts ($${tokenCost.toFixed(4)})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      stats.failed++;
    }

    console.log('');
  }

  console.log('================================');
  console.log('📊 Enrichment Complete\n');
  console.log(`Total chefs: ${stats.total}`);
  console.log(`Already had post: ${stats.alreadyHasPost}`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`✅ Success: ${stats.success}`);
  console.log(`⚠️  Low confidence (manual review): ${stats.lowConfidence}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`💰 Total cost: $${stats.totalCost.toFixed(2)}`);
  console.log(`💵 Avg cost/chef: $${stats.processed > 0 ? (stats.totalCost / stats.processed).toFixed(4) : '0.0000'}\n`);

  return stats;
}

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : undefined;
const testMode = args.includes('--test');
const minConfidence = args.includes('--min-confidence') 
  ? parseFloat(args[args.indexOf('--min-confidence') + 1]) 
  : 0.7;
const reviewMode = args.includes('--review-only');

if (args.includes('--help')) {
  console.log(`
Instagram Post Enrichment Script

Usage:
  npx tsx scripts/enrich-instagram-posts.ts [options]

Options:
  --test                    Dry run mode (don't save to database)
  --limit N                 Process only N chefs
  --min-confidence N        Minimum confidence to auto-save (default: 0.7)
  --review-only             Find posts but don't auto-save (for manual review)
  --help                    Show this help message

Examples:
  # Test on 5 chefs
  npx tsx scripts/enrich-instagram-posts.ts --test --limit 5

  # Process all chefs with high confidence posts only
  npx tsx scripts/enrich-instagram-posts.ts --min-confidence 0.9

  # Find posts but don't save (manual review)
  npx tsx scripts/enrich-instagram-posts.ts --review-only --limit 10

  # Full run (saves posts with confidence >= 0.7)
  npx tsx scripts/enrich-instagram-posts.ts
  `);
  process.exit(0);
}

enrichInstagramPosts({ 
  limit, 
  test: testMode, 
  minConfidence,
  autoSave: !reviewMode,
})
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

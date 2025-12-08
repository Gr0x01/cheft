#!/usr/bin/env npx tsx
/**
 * Test tiered extraction using cached Tavily data.
 * 
 * Usage:
 *   npx tsx scripts/test-tiered-extraction.ts "Chef Name"
 *   npx tsx scripts/test-tiered-extraction.ts  # lists available cached chefs
 * 
 * Requires: Chef must be in search_cache (run harvest first)
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import { extractWithGPT, synthesizeWithLocal, estimateCost, isLocalAvailable } from './ingestion/enrichment/shared/local-llm-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CachedSearch {
  entity_name: string;
  query: string;
  results: Array<{ title: string; url: string; content: string }>;
}

async function getCachedDataForChef(chefName: string): Promise<CachedSearch[]> {
  const { data } = await supabase
    .from('search_cache')
    .select('entity_name, query, results')
    .eq('entity_type', 'chef')
    .eq('entity_name', chefName);

  return data || [];
}

function buildContext(cached: CachedSearch[]): string {
  return cached
    .flatMap((c) => c.results)
    .map((r) => `### ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');
}

const EXTRACTION_PROMPT = (chefName: string, context: string) => `Extract data for chef "${chefName}" from these search results.

SEARCH RESULTS:
${context}

Return JSON only, no markdown:
{
  "shows": [
    {"name": "Show Name", "season": 11 or null, "year": 2021 or null, "role": "contestant/judge/host/mentor", "result": "winner/finalist/eliminated" or null}
  ],
  "restaurants": [
    {"name": "Restaurant Name", "city": "City", "state": "State", "ownership": "owner/partner/executive_chef/former", "status": "open/closed/unknown"}
  ],
  "bio": {
    "summary": "2-3 sentence bio",
    "awards": ["James Beard 2019"],
    "cookbooks": ["Book Title"]
  }
}

Rules:
- Use "season" for numbered seasons (Top Chef S11), "year" for year-based shows (GGG 2021)
- Include ownership type for restaurants
- Extract ALL shows and restaurants mentioned`;

const SYNTHESIS_PROMPT = (chefName: string, data: unknown) => `Write a 2-3 sentence professional bio for chef ${chefName} based on this extracted data:

${JSON.stringify(data, null, 2)}

Focus on their most notable TV appearances and restaurant ventures. Be concise and factual.`;

async function testTieredExtraction(chefName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧑‍🍳 Tiered Extraction Test: ${chefName}`);
  console.log('='.repeat(60));

  const localAvailable = await isLocalAvailable();
  console.log(`\n🖥️  Local LLM: ${localAvailable ? '✓ Online' : '✗ Offline'}`);

  const cached = await getCachedDataForChef(chefName);
  if (cached.length === 0) {
    console.log('\n❌ No cached data. Run harvest first:');
    console.log(`   npx tsx scripts/harvest-tavily-cache.ts --limit 10`);
    return;
  }
  console.log(`📦 Cached searches: ${cached.length}`);

  const context = buildContext(cached);
  console.log(`📝 Context: ${context.length} chars`);

  console.log('\n--- TIER 2: gpt-5-mini Extraction ---');
  const extractionStart = Date.now();
  const extraction = await extractWithGPT(EXTRACTION_PROMPT(chefName, context));
  const extractionTime = Date.now() - extractionStart;

  let parsed: { shows?: unknown[]; restaurants?: unknown[]; bio?: unknown } = {};
  try {
    const cleaned = extraction.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('  ⚠️  Failed to parse extraction JSON');
  }

  const shows = (parsed.shows as Array<{ name: string; season?: number; role?: string; result?: string }>) || [];
  const restaurants = (parsed.restaurants as Array<{ name: string; city?: string; ownership?: string; status?: string }>) || [];

  console.log(`  Model: ${extraction.model}`);
  console.log(`  Shows: ${shows.length} | Restaurants: ${restaurants.length}`);
  console.log(`  Tokens: ${extraction.usage.prompt} in / ${extraction.usage.completion} out`);
  console.log(`  Cost: $${estimateCost(extraction.usage, extraction.model).toFixed(5)}`);
  console.log(`  Time: ${extractionTime}ms`);

  console.log('\n--- TIER 3: Local Synthesis ---');
  const synthesisStart = Date.now();
  const synthesis = await synthesizeWithLocal(SYNTHESIS_PROMPT(chefName, parsed));
  const synthesisTime = Date.now() - synthesisStart;

  console.log(`  Model: ${synthesis.model}`);
  console.log(`  Local: ${synthesis.isLocal ? 'Yes' : 'No (fallback)'}`);
  console.log(`  Cost: $${estimateCost(synthesis.usage, synthesis.model).toFixed(5)}`);
  console.log(`  Time: ${synthesisTime}ms`);

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS');
  console.log('='.repeat(60));

  console.log('\n📺 Shows:');
  for (const s of shows.slice(0, 8)) {
    const season = s.season ? `S${s.season}` : '';
    console.log(`  • ${s.name} ${season} - ${s.role}${s.result ? ` [${s.result}]` : ''}`);
  }
  if (shows.length > 8) console.log(`  ... +${shows.length - 8} more`);

  console.log('\n🍽️  Restaurants:');
  for (const r of restaurants.slice(0, 5)) {
    console.log(`  • ${r.name} (${r.city}) - ${r.ownership || 'unknown'} [${r.status}]`);
  }
  if (restaurants.length > 5) console.log(`  ... +${restaurants.length - 5} more`);

  console.log('\n📝 Generated Bio:');
  console.log(`  ${synthesis.text.trim()}`);

  const totalCost = estimateCost(extraction.usage, extraction.model);
  console.log(`\n💰 Total: $${totalCost.toFixed(5)} | ⏱️  ${extractionTime + synthesisTime}ms`);
}

async function listCachedChefs() {
  const { data } = await supabase
    .from('search_cache')
    .select('entity_name')
    .eq('entity_type', 'chef');

  const unique = [...new Set(data?.map((d) => d.entity_name))];
  
  console.log('\n📦 Cached chefs available:\n');
  for (const name of unique.sort()) {
    console.log(`  • ${name}`);
  }
  console.log(`\nTotal: ${unique.length} chefs`);
  console.log('\nUsage: npx tsx scripts/test-tiered-extraction.ts "Chef Name"');
}

async function main() {
  const chefName = process.argv[2];

  if (!chefName) {
    await listCachedChefs();
  } else {
    await testTieredExtraction(chefName);
  }
}

main().catch(console.error);

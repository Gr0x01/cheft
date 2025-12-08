#!/usr/bin/env npx tsx
/**
 * Test script for comparing extraction models on Tavily search results.
 * 
 * Usage:
 *   npx tsx scripts/test-extraction-comparison.ts "Chef Name"
 *   npx tsx scripts/test-extraction-comparison.ts "Brian Malarkey" --verbose
 *   npx tsx scripts/test-extraction-comparison.ts --tavily-only "Chef Name"
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import OpenAI from 'openai';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://10.2.0.10:1234';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5-mini': { input: 0.25, output: 2.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'qwen/qwen3-8b': { input: 0, output: 0 },
};

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface ExtractionResult {
  model: string;
  shows: Array<{ name: string; season?: string; year?: number; role: string; result?: string }>;
  restaurants: Array<{ name: string; city: string; state?: string; ownership?: string; status?: string }>;
  bio?: { summary?: string; awards?: string[]; cookbooks?: string[] };
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timeMs: number;
}

const QUERIES = {
  shows: (name: string) => `${name} chef TV shows Top Chef Iron Chef winner finalist season`,
  bio: (name: string) => `${name} chef biography Wikipedia James Beard Michelin star awards`,
  restaurants: (name: string) => `${name} chef restaurants owner executive chef partner locations`,
};

async function searchTavily(query: string): Promise<TavilyResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      include_raw_content: false,
      max_results: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
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

async function extractWithOpenAI(
  chefName: string,
  searchResults: TavilyResult[],
  model: string
): Promise<ExtractionResult> {
  const context = searchResults
    .map((r) => `### ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');

  const start = Date.now();
  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: EXTRACTION_PROMPT(chefName, context) }],
  });

  const timeMs = Date.now() - start;
  const content = response.choices[0]?.message?.content || '{}';
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;

  const pricing = PRICING[model] || { input: 0, output: 0 };
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;

  let parsed: { shows?: unknown[]; restaurants?: unknown[]; bio?: unknown } = {};
  try {
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error(`  ⚠️  Failed to parse JSON from ${model}`);
  }

  return {
    model,
    shows: (parsed.shows as ExtractionResult['shows']) || [],
    restaurants: (parsed.restaurants as ExtractionResult['restaurants']) || [],
    bio: parsed.bio as ExtractionResult['bio'],
    inputTokens,
    outputTokens,
    cost,
    timeMs,
  };
}

async function extractWithLocal(
  chefName: string,
  searchResults: TavilyResult[]
): Promise<ExtractionResult> {
  const context = searchResults
    .map((r) => `### ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n');

  const start = Date.now();

  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3-8b',
        messages: [{ role: 'user', content: EXTRACTION_PROMPT(chefName, context) }],
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.status}`);
    }

    const data = await response.json();
    const timeMs = Date.now() - start;
    const content = data.choices[0]?.message?.content || '{}';
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    let parsed: { shows?: unknown[]; restaurants?: unknown[]; bio?: unknown } = {};
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('  ⚠️  Failed to parse JSON from local model');
    }

    return {
      model: 'qwen/qwen3-8b',
      shows: (parsed.shows as ExtractionResult['shows']) || [],
      restaurants: (parsed.restaurants as ExtractionResult['restaurants']) || [],
      bio: parsed.bio as ExtractionResult['bio'],
      inputTokens,
      outputTokens,
      cost: 0,
      timeMs,
    };
  } catch (error) {
    return {
      model: 'qwen/qwen3-8b (offline)',
      shows: [],
      restaurants: [],
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
      timeMs: Date.now() - start,
    };
  }
}

async function runTavilyOnly(chefName: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Tavily Search Results for: ${chefName}`);
  console.log('='.repeat(70));

  for (const [type, queryFn] of Object.entries(QUERIES)) {
    const query = queryFn(chefName);
    console.log(`\n📌 ${type.toUpperCase()}: "${query}"\n`);

    const results = await searchTavily(query);
    console.log(`Found ${results.length} results:\n`);

    for (const r of results) {
      console.log(`  • ${r.title}`);
      console.log(`    ${r.url}`);
      console.log(`    ${r.content?.substring(0, 120)}...`);
      console.log();
    }
  }
}

async function runComparison(chefName: string, verbose: boolean) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧑‍🍳 Extraction Comparison for: ${chefName}`);
  console.log('='.repeat(70));

  console.log('\n📡 Fetching from Tavily (3 queries)...');
  let allResults: TavilyResult[] = [];
  let tavilyCost = 0;

  for (const [type, queryFn] of Object.entries(QUERIES)) {
    const query = queryFn(chefName);
    const results = await searchTavily(query);
    allResults = allResults.concat(results);
    tavilyCost += 0.008;
    console.log(`  ✓ ${type}: ${results.length} results`);
  }

  console.log(`\n📊 Total: ${allResults.length} results | Tavily cost: $${tavilyCost.toFixed(3)}`);
  console.log('\n' + '-'.repeat(70));

  const results: ExtractionResult[] = [];

  for (const model of ['gpt-4o-mini', 'gpt-5-mini']) {
    console.log(`\n🤖 ${model}...`);
    try {
      const result = await extractWithOpenAI(chefName, allResults, model);
      results.push(result);
      console.log(`  ✓ Shows: ${result.shows.length} | Restaurants: ${result.restaurants.length}`);
      console.log(`  ✓ Cost: $${result.cost.toFixed(5)} | Time: ${result.timeMs}ms`);
    } catch (error) {
      console.log(`  ✗ Error: ${error}`);
    }
  }

  console.log(`\n🖥️  qwen/qwen3-8b (local)...`);
  const localResult = await extractWithLocal(chefName, allResults);
  results.push(localResult);
  if (localResult.shows.length > 0) {
    console.log(`  ✓ Shows: ${localResult.shows.length} | Restaurants: ${localResult.restaurants.length}`);
    console.log(`  ✓ Cost: FREE | Time: ${localResult.timeMs}ms`);
  } else {
    console.log(`  ✗ Local model offline or failed`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📈 SUMMARY');
  console.log('='.repeat(70));
  console.log('\n| Model              | Shows | Restaurants | Cost      | Time    |');
  console.log('|--------------------|-------|-------------|-----------|---------|');
  for (const r of results) {
    const costStr = r.cost === 0 ? 'FREE' : `$${r.cost.toFixed(4)}`;
    console.log(
      `| ${r.model.padEnd(18)} | ${String(r.shows.length).padEnd(5)} | ${String(r.restaurants.length).padEnd(11)} | ${costStr.padEnd(9)} | ${r.timeMs}ms |`
    );
  }

  if (verbose) {
    console.log('\n📋 DETAILED RESULTS');
    for (const r of results) {
      console.log(`\n--- ${r.model} ---`);
      console.log('Shows:', JSON.stringify(r.shows, null, 2));
      console.log('Restaurants:', JSON.stringify(r.restaurants, null, 2));
      if (r.bio) console.log('Bio:', JSON.stringify(r.bio, null, 2));
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const tavilyOnly = args.includes('--tavily-only');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const chefName = args.find((a) => !a.startsWith('-')) || 'Brian Malarkey';

  if (tavilyOnly) {
    await runTavilyOnly(chefName);
  } else {
    await runComparison(chefName, verbose);
  }
}

main().catch(console.error);

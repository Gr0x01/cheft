import * as dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config({ path: '.env.local' });

import { searchTavily, getCacheStats } from './ingestion/enrichment/shared/tavily-client';
import { synthesize, synthesizeRaw, isLocalAvailable, getTierInfo } from './ingestion/enrichment/shared/synthesis-client';

async function main() {
  console.log('━'.repeat(60));
  console.log('🧪 Enricher v2 Smoke Test');
  console.log('━'.repeat(60));

  console.log('\n1️⃣  Checking tier configuration...');
  const tierInfo = getTierInfo();
  console.log(`   Accuracy model: ${tierInfo.accuracyModel}`);
  console.log(`   Creative model: ${tierInfo.creativeModel}`);
  console.log(`   Local URL: ${tierInfo.localUrl || '(not configured)'}`);
  
  const localAvailable = await isLocalAvailable();
  console.log(`   Local LLM available: ${localAvailable}`);

  console.log('\n2️⃣  Testing Tavily search...');
  const searchResult = await searchTavily('Rick Bayless chef restaurants', {
    entityType: 'chef',
    entityName: 'Rick Bayless',
  });
  console.log(`   Results: ${searchResult.results.length}`);
  console.log(`   From cache: ${searchResult.fromCache}`);
  if (searchResult.results[0]) {
    console.log(`   First result: ${searchResult.results[0].title.substring(0, 50)}...`);
  }

  console.log('\n3️⃣  Testing cache hit...');
  const searchResult2 = await searchTavily('Rick Bayless chef restaurants', {
    entityType: 'chef',
    entityName: 'Rick Bayless',
  });
  console.log(`   From cache: ${searchResult2.fromCache} (should be true)`);

  console.log('\n4️⃣  Testing synthesize (accuracy tier)...');
  const TestSchema = z.object({
    name: z.string(),
    cuisine: z.string(),
  });
  
  const synthesisResult = await synthesize(
    'accuracy',
    'You extract structured data. Return valid JSON with exactly these fields: name (string), cuisine (string).',
    'Rick Bayless is a famous chef known for Mexican cuisine. Return JSON: {"name": "...", "cuisine": "..."}',
    TestSchema,
    { maxTokens: 100 }
  );
  
  if (synthesisResult.success && synthesisResult.data) {
    console.log(`   Success: ${JSON.stringify(synthesisResult.data)}`);
    console.log(`   Model: ${synthesisResult.model}`);
    console.log(`   Tokens: ${synthesisResult.usage.total}`);
  } else {
    console.log(`   ❌ Failed: ${synthesisResult.error}`);
  }

  console.log('\n5️⃣  Testing synthesizeRaw (creative tier)...');
  const rawResult = await synthesizeRaw(
    'creative',
    'You write brief restaurant descriptions.',
    'Write one sentence about Frontera Grill in Chicago.',
    { maxTokens: 100 }
  );
  
  if (rawResult.success && rawResult.text.length > 0) {
    console.log(`   Success: "${rawResult.text.substring(0, 80)}..."`);
    console.log(`   Model: ${rawResult.model}`);
    console.log(`   Is local: ${rawResult.isLocal}`);
    console.log(`   Tokens: ${rawResult.usage.total}`);
  } else {
    console.log(`   ❌ Failed: ${rawResult.error || 'Empty response'}`);
  }

  console.log('\n6️⃣  Cache stats...');
  const stats = await getCacheStats();
  console.log(`   Total entries: ${stats.total}`);
  console.log(`   By type: ${JSON.stringify(stats.byType)}`);
  console.log(`   Expired: ${stats.expired}`);

  console.log('\n' + '━'.repeat(60));
  console.log('✅ Smoke test complete!');
  console.log('━'.repeat(60));
}

main().catch(console.error);

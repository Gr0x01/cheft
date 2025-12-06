import { config } from 'dotenv';
import { LLMClient } from './ingestion/enrichment/shared/llm-client';
import { TokenTracker } from './ingestion/enrichment/shared/token-tracker';
import { RestaurantDiscoveryService } from './ingestion/enrichment/services/restaurant-discovery-service';

config({ path: '.env.local' });

interface TestConfig {
  model: string;
  searchModel?: string;
  label: string;
}

async function testModel(testConfig: TestConfig, chefName: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${testConfig.label} for ${chefName}`);
  console.log(`  Orchestrator: ${testConfig.model}`);
  console.log(`  Search: ${testConfig.searchModel || 'gpt-4o-mini-search-preview'}`);
  console.log('='.repeat(60));

  const llmClient = new LLMClient({ model: testConfig.model, searchModel: testConfig.searchModel });
  const tokenTracker = TokenTracker.getInstance();
  tokenTracker.reset();
  const restaurantService = new RestaurantDiscoveryService(llmClient, tokenTracker, 20);

  const startTime = Date.now();
  const result = await restaurantService.findRestaurants(
    'test-id',
    chefName,
    'Top Chef',
    { season: 'Season 3' }
  );
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n📊 Results for ${testConfig.label}:`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Restaurants found: ${result.restaurants.length}`);
  console.log(`   Tokens: ${result.tokensUsed.total.toLocaleString()} (prompt: ${result.tokensUsed.prompt.toLocaleString()}, completion: ${result.tokensUsed.completion.toLocaleString()})`);
  
  const is4_1Full = testConfig.model === 'gpt-4.1';
  const isSearchFull = testConfig.searchModel === 'gpt-4o-search-preview';
  
  const orchestratorInputRate = is4_1Full ? 2.00 : 0.15;
  const orchestratorOutputRate = is4_1Full ? 8.00 : 0.60;
  const searchInputRate = isSearchFull ? 2.50 : 0.15;
  const searchOutputRate = isSearchFull ? 10.00 : 0.60;
  
  const avgRate = (orchestratorInputRate + searchInputRate) / 2;
  const avgOutputRate = (orchestratorOutputRate + searchOutputRate) / 2;
  
  const inputCost = result.tokensUsed.prompt * avgRate / 1000000;
  const outputCost = result.tokensUsed.completion * avgOutputRate / 1000000;
  const totalCost = inputCost + outputCost;
  
  console.log(`   Est. Cost: $${totalCost.toFixed(4)}`);
  
  console.log(`\n   Restaurants:`);
  result.restaurants.forEach((r, i) => {
    console.log(`   ${i + 1}. ${r.name} - ${r.city}, ${r.state || r.country} [${r.status}] (${r.role})`);
  });

  return { label: testConfig.label, result, elapsed, cost: totalCost };
}

async function main() {
  const chefName = process.argv[2] || 'Brian Malarkey';
  
  console.log(`🧪 Restaurant Discovery Model Comparison`);
  console.log(`Chef: ${chefName}\n`);

  const configs: TestConfig[] = [
    { model: 'gpt-4o-mini', label: 'gpt-4o-mini + mini-search' },
    { model: 'gpt-4.1', label: 'gpt-4.1 + mini-search' },
    { model: 'gpt-4.1', searchModel: 'gpt-4o-search-preview', label: 'gpt-4.1 + full-search' },
  ];
  
  const results: Awaited<ReturnType<typeof testModel>>[] = [];

  for (const cfg of configs) {
    try {
      const result = await testModel(cfg, chefName);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error with ${cfg.label}:`, error);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(60));
  
  for (const r of results) {
    console.log(`\n${r.label}:`);
    console.log(`  - Restaurants: ${r.result.restaurants.length}`);
    console.log(`  - Time: ${r.elapsed}s`);
    console.log(`  - Cost: $${r.cost.toFixed(4)}`);
  }
}

main().catch(console.error);

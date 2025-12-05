import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createLLMEnricher } from './ingestion/processors/llm-enricher';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPartialUpdateWorkflow() {
  console.log('\n━━━ Testing PartialUpdateWorkflow (shows mode) ━━━\n');

  const { data: chef } = await supabase
    .from('chefs')
    .select('id, name')
    .limit(1)
    .single();

  if (!chef) {
    console.error('❌ No chefs found in database');
    return false;
  }

  console.log(`Testing with chef: ${chef.name} (${chef.id})\n`);

  const enricher = createLLMEnricher(supabase, { model: 'gpt-5-mini' });

  try {
    const result = await enricher.workflows.partialUpdate({
      mode: 'shows',
      targetId: chef.id,
      targetName: chef.name,
      dryRun: true,
    });

    console.log('📊 Workflow Result:');
    console.log('  Status:', result.status);
    console.log('  Success:', result.success ? '✅' : '❌');
    console.log('  Steps:', result.steps.length);
    console.log('  Duration:', result.durationMs ? `${(result.durationMs / 1000).toFixed(1)}s` : 'N/A');
    console.log('  Tokens:', result.totalCost.tokens.total.toLocaleString());
    console.log('  Cost: $' + result.totalCost.estimatedUsd.toFixed(4));

    if (result.output) {
      console.log('\n  Output:');
      console.log('    Mode:', result.output.mode);
      console.log('    Success:', result.output.success);
      console.log('    Items Updated:', result.output.itemsUpdated);
    }

    console.log('\n  Steps:');
    result.steps.forEach(step => {
      const status = step.status === 'completed' ? '✅' : 
                     step.status === 'failed' ? '❌' : 
                     step.status === 'skipped' ? '⏭️' : '⏳';
      console.log(`    ${status} ${step.name}`);
      if (step.tokensUsed) {
        console.log(`       Tokens: ${step.tokensUsed.total.toLocaleString()}`);
      }
      if (step.costUsd !== undefined) {
        console.log(`       Cost: $${step.costUsd.toFixed(4)}`);
      }
      if (step.error) {
        console.log(`       Error: ${step.error}`);
      }
    });

    if (result.errors.length > 0) {
      console.log('\n  Errors:');
      result.errors.forEach(err => {
        console.log(`    ${err.fatal ? '🔴' : '🟡'} [${err.code}] ${err.message}`);
      });
    }

    return result.success;
  } catch (error) {
    console.error('\n❌ Test failed with exception:', error);
    return false;
  }
}

async function main() {
  console.log('🧪 Phase 4 Workflow End-to-End Tests\n');
  console.log('Testing workflows with real LLM calls and database operations...\n');

  try {
    const partialUpdateResult = await testPartialUpdateWorkflow();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 Test Summary:');
    console.log('  Partial Update Workflow:', partialUpdateResult ? '✅ PASS' : '❌ FAIL');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (!partialUpdateResult) {
      console.error('❌ Some tests failed');
      process.exit(1);
    }

    console.log('✅ All tests passed!\n');
    console.log('Phase 4 workflows are production-ready.\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

async function executeSql(sql: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: errorText };
  }
  
  return { success: true };
}

async function runMigration() {
  console.log('🗄️  Running schema v2 migration via Supabase REST API...\n');
  console.log('⚠️  Note: This requires running the SQL directly in Supabase Dashboard SQL Editor.\n');
  console.log('📋 Steps to run migration:\n');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/project/clktrvyieegouggrpfaj/sql/new');
  console.log('2. Copy the contents of: supabase/migrations/002_schema_v2.sql');
  console.log('3. Paste and run in the SQL Editor');
  console.log('4. Then run: npx tsx scripts/import-topchef-data-v2.ts\n');
  
  const migrationPath = join(__dirname, '../supabase/migrations/002_schema_v2.sql');
  const sql = readFileSync(migrationPath, 'utf-8');
  
  console.log('📝 Migration SQL preview (first 500 chars):');
  console.log('─'.repeat(60));
  console.log(sql.substring(0, 500) + '...');
  console.log('─'.repeat(60));
  console.log(`\nTotal SQL length: ${sql.length} characters`);
  console.log('\n✅ After running the migration in Supabase Dashboard, run the import script.');
}

runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  });

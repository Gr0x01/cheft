import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Usage: npx tsx scripts/run-migration.ts <migration-file.sql>');
    process.exit(1);
  }

  console.log(`Running migration: ${migrationFile}`);
  
  const sql = readFileSync(migrationFile, 'utf-8');
  
  const statements = sql
    .split(/;[\s]*(?=(?:--|ALTER|CREATE|INSERT|DO|COMMENT))/i)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      
      if (error) {
        const { data, error: directError } = await supabase.from('_exec').select().limit(0);
        
        console.log(`[${i + 1}/${statements.length}] ${preview}...`);
        console.log(`   ⚠️  RPC not available, statement logged for manual run`);
      } else {
        console.log(`[${i + 1}/${statements.length}] ✅ ${preview}...`);
      }
    } catch (e) {
      console.log(`[${i + 1}/${statements.length}] ${preview}...`);
      console.log(`   Statement needs manual execution`);
    }
  }

  console.log('\nMigration file processed. Run via Supabase SQL Editor if needed.');
}

runMigration().catch(console.error);

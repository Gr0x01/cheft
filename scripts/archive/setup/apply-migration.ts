import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('Applying migration 017_add_narrative_content_fields...');
  
  const statements = [
    "ALTER TABLE chefs ADD COLUMN IF NOT EXISTS career_narrative TEXT",
    "ALTER TABLE chefs ADD COLUMN IF NOT EXISTS narrative_generated_at TIMESTAMPTZ",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS restaurant_narrative TEXT",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS narrative_generated_at TIMESTAMPTZ",
    "ALTER TABLE cities ADD COLUMN IF NOT EXISTS city_narrative TEXT",
    "ALTER TABLE cities ADD COLUMN IF NOT EXISTS narrative_generated_at TIMESTAMPTZ",
    "CREATE INDEX IF NOT EXISTS idx_chefs_narrative_missing ON chefs(narrative_generated_at) WHERE career_narrative IS NULL",
    "CREATE INDEX IF NOT EXISTS idx_restaurants_narrative_missing ON restaurants(narrative_generated_at) WHERE restaurant_narrative IS NULL",
    "CREATE INDEX IF NOT EXISTS idx_cities_narrative_missing ON cities(narrative_generated_at) WHERE city_narrative IS NULL",
  ];

  for (const sql of statements) {
    console.log(`Running: ${sql.substring(0, 80)}...`);
    const { error } = await supabase.rpc('exec_sql' as any, { sql_string: sql });
    if (error) {
      console.error(`❌ Error:`, error);
    } else {
      console.log('✅ Success');
    }
  }

  console.log('\n✅ Migration complete!');
}

applyMigration().catch(console.error);

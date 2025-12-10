import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function applyMigration() {
  console.log('Applying migration: restaurant_chefs junction table...\n');
  console.log('Supabase URL:', supabaseUrl);

  const { data: tableCheck, error: tableErr } = await supabase
    .from('restaurant_chefs')
    .select('id')
    .limit(1);

  if (tableErr && tableErr.code === '42P01') {
    console.log('Table does not exist - you need to run this SQL in Supabase Dashboard:\n');
    console.log(`
-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS restaurant_chefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'co-owner', 'partner', 'executive_chef', 'consultant')),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, chef_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_chefs_restaurant ON restaurant_chefs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_chefs_chef ON restaurant_chefs(chef_id);

ALTER TABLE restaurant_chefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read restaurant_chefs" ON restaurant_chefs FOR SELECT USING (true);

-- Migrate existing data
INSERT INTO restaurant_chefs (restaurant_id, chef_id, role, is_primary)
SELECT id, chef_id, COALESCE(chef_role, 'owner'), true
FROM restaurants
WHERE chef_id IS NOT NULL;
    `);
    return;
  }

  if (tableErr) {
    console.error('Error checking table:', tableErr);
    return;
  }

  console.log('✅ Table exists!');

  const { data: existing } = await supabase
    .from('restaurant_chefs')
    .select('id')
    .limit(1);
  
  if (existing && existing.length > 0) {
    console.log('Data already migrated');
    const { count } = await supabase
      .from('restaurant_chefs')
      .select('id', { count: 'exact', head: true });
    console.log(`Total records: ${count}`);
  } else {
    console.log('Need to migrate data - run the INSERT statement in dashboard');
  }
}

applyMigration().catch(console.error);

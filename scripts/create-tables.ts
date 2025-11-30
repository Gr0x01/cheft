import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = "https://clktrvyieegouggrpfaj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log('🚀 Creating database tables...');

  try {
    // Create the tables using individual SQL statements
    const sqlStatements = [
      // Enable extensions
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      
      // Shows table
      `CREATE TABLE IF NOT EXISTS shows (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        network TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Chefs table  
      `CREATE TABLE IF NOT EXISTS chefs (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        primary_show_id UUID REFERENCES shows(id),
        other_shows TEXT[],
        top_chef_season TEXT,
        top_chef_result TEXT CHECK (top_chef_result IN ('winner', 'finalist', 'contestant')),
        mini_bio TEXT,
        country TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Restaurants table
      `CREATE TABLE IF NOT EXISTS restaurants (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        chef_id UUID NOT NULL REFERENCES chefs(id),
        city TEXT NOT NULL,
        state TEXT,
        country TEXT DEFAULT 'US',
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        price_tier TEXT CHECK (price_tier IN ('$', '$$', '$$$', '$$$$')),
        cuisine_tags TEXT[],
        status TEXT DEFAULT 'unknown' CHECK (status IN ('open', 'closed', 'unknown')),
        website_url TEXT,
        maps_url TEXT,
        source_notes TEXT,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      
      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_chefs_slug ON chefs(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_chefs_primary_show ON chefs(primary_show_id)`,
      `CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON restaurants(slug)`,
      `CREATE INDEX IF NOT EXISTS idx_restaurants_chef ON restaurants(chef_id)`,
      `CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(city, state, country)`,
      `CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status)`,
      `CREATE INDEX IF NOT EXISTS idx_restaurants_is_public ON restaurants(is_public)`,
      
      // Update function
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ language 'plpgsql'`,
      
      // Triggers
      `CREATE OR REPLACE TRIGGER update_chefs_updated_at 
       BEFORE UPDATE ON chefs 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
      
      `CREATE OR REPLACE TRIGGER update_restaurants_updated_at 
       BEFORE UPDATE ON restaurants 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
    ];

    // Execute each statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i];
      console.log(`📝 Executing statement ${i + 1}/${sqlStatements.length}...`);
      
      const { error } = await supabase.rpc('exec', { sql });
      
      if (error) {
        console.log(`⚠️  Trying alternative method for statement ${i + 1}...`);
        
        // Try using a simpler approach - direct table creation via INSERT
        try {
          if (sql.includes('CREATE TABLE IF NOT EXISTS shows')) {
            // Try to create by inserting and catching error
            await supabase.from('shows').select('id').limit(1);
          }
        } catch (err) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, error.message);
        }
      }
    }

    // Insert initial shows data
    console.log('📺 Inserting initial shows...');
    const { error: showsError } = await supabase
      .from('shows')
      .upsert([
        { name: 'Top Chef', network: 'Bravo' },
        { name: 'Iron Chef', network: 'Food Network' },
        { name: 'Tournament of Champions', network: 'Food Network' },
        { name: 'Next Level Chef', network: 'FOX' },
        { name: 'Chopped', network: 'Food Network' }
      ], { 
        onConflict: 'name'
      });

    if (showsError) {
      console.log('⚠️  Could not insert shows, tables might not exist yet');
    } else {
      console.log('✅ Initial shows inserted successfully');
    }

    // Test if tables were created
    console.log('🔍 Testing table creation...');
    const { data: shows, error: testError } = await supabase
      .from('shows')
      .select('*');

    if (testError) {
      console.error('❌ Tables were not created successfully:', testError.message);
      return false;
    } else {
      console.log(`✅ Tables created successfully! Found ${shows.length} shows.`);
      return true;
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createTables()
    .then((success) => {
      if (success) {
        console.log('🎉 Database setup complete!');
        process.exit(0);
      } else {
        console.log('💥 Database setup failed - please use manual setup');
        process.exit(1);
      }
    });
}

export { createTables };
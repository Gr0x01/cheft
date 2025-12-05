import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTablesDirectly() {
  console.log('🚀 Creating database tables using REST API...');

  try {
    // Step 1: Create shows table by inserting data (this will auto-create the table)
    console.log('📺 Creating shows table...');
    
    const showsData = [
      { name: 'Top Chef', network: 'Bravo' },
      { name: 'Iron Chef', network: 'Food Network' },
      { name: 'Tournament of Champions', network: 'Food Network' },
      { name: 'Next Level Chef', network: 'FOX' },
      { name: 'Chopped', network: 'Food Network' }
    ];
    
    // Try to insert shows - this approach relies on Supabase auto-creating tables from the dashboard
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .insert(showsData)
      .select();
    
    if (showsError) {
      if (showsError.message.includes('relation "public.shows" does not exist')) {
        console.log('⚠️  Tables do not exist. You need to create them manually in the Supabase dashboard.');
        console.log('\nTo create tables manually:');
        console.log('1. Go to https://supabase.com/dashboard/project/clktrvyieegouggrpfaj/sql');
        console.log('2. Run the contents of supabase/migrations/001_initial_schema.sql');
        console.log('3. Then run this script again');
        return false;
      } else {
        console.error('❌ Error creating shows:', showsError);
        return false;
      }
    }
    
    console.log(`✅ Created ${shows?.length} shows`);
    
    // Test that we can read from all tables
    console.log('🔍 Testing table access...');
    
    const { data: chefsData, error: chefsError } = await supabase
      .from('chefs')
      .select('*');
    
    if (chefsError) {
      console.error('❌ Error accessing chefs table:', chefsError);
      return false;
    }
    
    const { data: restaurantsData, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('*');
    
    if (restaurantsError) {
      console.error('❌ Error accessing restaurants table:', restaurantsError);
      return false;
    }
    
    console.log('✅ All tables accessible');
    console.log(`   Shows: ${shows?.length || 0}`);
    console.log(`   Chefs: ${chefsData?.length || 0}`);
    console.log(`   Restaurants: ${restaurantsData?.length || 0}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  createTablesDirectly()
    .then((success) => {
      if (success) {
        console.log('🎉 Database setup complete!');
        process.exit(0);
      } else {
        console.log('💥 Database setup failed');
        process.exit(1);
      }
    });
}

export { createTablesDirectly };
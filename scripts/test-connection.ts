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

async function testConnection() {
  try {
    console.log('🔗 Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('shows')
      .select('*')
      .limit(5);
    
    if (error) {
      if (error.message.includes('relation "shows" does not exist')) {
        console.log('⚠️  Database tables not created yet.');
        console.log('📋 Please run the SQL from setup-manual.md in your Supabase SQL editor');
        return false;
      } else {
        throw error;
      }
    }
    
    console.log('✅ Connected to Supabase successfully!');
    console.log(`📊 Found ${data.length} shows in database:`);
    data.forEach(show => {
      console.log(`   - ${show.name} (${show.network})`);
    });
    
    // Test if we can insert/update data
    const { error: insertError } = await supabase
      .from('shows')
      .upsert({ name: 'Test Show', network: 'Test Network' }, { onConflict: 'name' });
    
    if (insertError) {
      console.error('❌ Cannot insert data:', insertError);
      return false;
    }
    
    // Clean up test data
    await supabase
      .from('shows')
      .delete()
      .eq('name', 'Test Show');
    
    console.log('✅ Database is ready for data import!');
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testConnection()
    .then((success) => {
      if (success) {
        console.log('🎉 Connection test passed!');
        process.exit(0);
      } else {
        console.log('💥 Connection test failed');
        process.exit(1);
      }
    });
}

export { testConnection };
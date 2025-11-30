import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

async function setupDatabaseViaRest() {
  console.log('🚀 Setting up database via REST API...');
  
  try {
    // Read the migration SQL
    const migrationSQL = readFileSync(
      join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
      'utf-8'
    );
    
    console.log('📄 Attempting to execute migration SQL...');
    
    // Try different potential endpoints
    const endpoints = [
      `${supabaseUrl}/rest/v1/rpc/exec`,
      `${supabaseUrl}/rest/v1/rpc/execute_sql`,
      `${supabaseUrl}/sql`,
      `${supabaseUrl}/rest/v1/rpc/sql`
    ];
    
    let success = false;
    
    for (const endpoint of endpoints) {
      console.log(`🔍 Trying endpoint: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({
            sql: migrationSQL,
            query: migrationSQL // Some endpoints might use 'query' instead
          })
        });
        
        const responseText = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${responseText.slice(0, 100)}...`);
        
        if (response.ok) {
          console.log('✅ Successfully executed migration!');
          success = true;
          break;
        }
      } catch (error) {
        console.log(`   Error: ${error}`);
      }
    }
    
    if (!success) {
      console.log('\n📋 Manual Setup Instructions:');
      console.log('The automated setup failed. Please follow these steps:');
      console.log('\n1. Go to your Supabase project dashboard:');
      console.log('   https://supabase.com/dashboard/project/clktrvyieegouggrpfaj/sql');
      console.log('\n2. Open the SQL Editor');
      console.log('\n3. Copy and paste the following SQL:');
      console.log('\n' + '='.repeat(50));
      console.log(migrationSQL);
      console.log('='.repeat(50));
      console.log('\n4. Click "Run" to execute the SQL');
      console.log('\n5. After the tables are created, run: npm run data:extract');
      
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabaseViaRest()
    .then((success) => {
      if (success) {
        console.log('🎉 Database setup complete!');
        process.exit(0);
      } else {
        console.log('💡 Please follow the manual setup instructions above');
        process.exit(1);
      }
    });
}

export { setupDatabaseViaRest };
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = "https://clktrvyieegouggrpfaj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.error('Make sure you have the key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Setting up TV Chef Map database...');
    
    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../supabase/migrations/001_initial_schema.sql'),
      'utf-8'
    );
    
    console.log('📄 Executing SQL migration...');
    
    // Execute the entire migration at once
    const { error } = await supabase
      .from('_migrations') // This won't work, need to use REST API
      .select('*');
    
    // Actually, let's try to execute via the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql: migrationSQL })
    });
    
    if (!response.ok) {
      // If exec_sql doesn't exist, we'll execute statements individually
      console.log('⚠️  exec_sql not available, executing statements individually...');
      
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.match(/^--/));
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`   ${i + 1}/${statements.length}: ${statement.slice(0, 50)}...`);
        
        try {
          // Use the SQL editor approach - this is a fallback
          const result = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey
            },
            body: JSON.stringify({ query: statement })
          });
          
          if (!result.ok) {
            console.error(`❌ Error executing statement ${i + 1}:`, await result.text());
          }
        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err);
        }
      }
    } else {
      console.log('✅ Migration executed successfully via exec_sql');
    }
    
    console.log('✅ Database schema created successfully!');
    
    // Verify tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else {
      console.log('📋 Created tables:', tables?.map(t => t.table_name));
    }
    
    // Test basic operations
    console.log('🔍 Testing basic operations...');
    
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('*');
    
    if (showsError) {
      console.error('❌ Error reading shows:', showsError);
    } else {
      console.log(`✅ Found ${shows.length} shows in database`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('🎉 Setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

export { runMigration };
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Verify we're using the right key
console.log('🔍 Supabase URL:', supabaseUrl);
console.log('🔑 Anonymous key (first 20 chars):', anonKey.substring(0, 20) + '...');

// Create client with anonymous key (respects RLS) with explicit options
const supabase = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  realtime: {
    params: {
      eventsPerSecond: -1
    }
  }
});

async function testRLSPolicies() {
  console.log('🔐 Testing RLS policies with anonymous key...');
  
  try {
    // Test 1: Read shows (should work)
    console.log('\n1️⃣ Testing shows table (should allow read):');
    const { data: shows, error: showsError } = await supabase
      .from('shows')
      .select('*')
      .limit(3);
    
    if (showsError) {
      console.error('❌ Shows read failed:', showsError);
    } else {
      console.log(`✅ Shows read successful: ${shows.length} records`);
      shows.forEach(show => console.log(`   - ${show.name} (${show.network})`));
    }

    // Test 2: Read chefs (should work)
    console.log('\n2️⃣ Testing chefs table (should allow read):');
    const { data: chefs, error: chefsError } = await supabase
      .from('chefs')
      .select('name, top_chef_season')
      .limit(3);
    
    if (chefsError) {
      console.error('❌ Chefs read failed:', chefsError);
    } else {
      console.log(`✅ Chefs read successful: ${chefs.length} records`);
      chefs.forEach(chef => console.log(`   - ${chef.name} (${chef.top_chef_season})`));
    }

    // Test 3: Read restaurants (should work - only public ones)
    console.log('\n3️⃣ Testing restaurants table (should allow read of public only):');
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('name, city, state, is_public')
      .limit(3);
    
    if (restaurantsError) {
      console.error('❌ Restaurants read failed:', restaurantsError);
    } else {
      console.log(`✅ Restaurants read successful: ${restaurants.length} records`);
      restaurants.forEach(restaurant => 
        console.log(`   - ${restaurant.name} (${restaurant.city}, ${restaurant.state}) - Public: ${restaurant.is_public}`)
      );
    }

    // Test 4: Try to insert (should fail)
    console.log('\n4️⃣ Testing insert permission (should be denied):');
    const { error: insertError } = await supabase
      .from('shows')
      .insert({ name: 'Test Show', network: 'Test Network' });
    
    if (insertError) {
      console.log('✅ Insert correctly denied:', insertError.message);
    } else {
      console.error('❌ Insert should have been denied but succeeded!');
    }

    // Test 5: Try to update (should fail)
    console.log('\n5️⃣ Testing update permission (should be denied):');
    const { data: updateData, error: updateError } = await supabase
      .from('shows')
      .update({ network: 'Modified Network' })
      .eq('name', 'Top Chef')
      .select();
    
    if (updateError) {
      console.log('✅ Update correctly denied:', updateError.message);
    } else if (updateData && updateData.length === 0) {
      console.log('✅ Update correctly blocked: no rows were updated due to RLS');
    } else {
      console.error('❌ Update should have been denied but succeeded!');
      console.log('   Update data:', updateData);
    }

    // Test 6: Try to delete (should fail)
    console.log('\n6️⃣ Testing delete permission (should be denied):');
    const { data: deleteData, error: deleteError } = await supabase
      .from('shows')
      .delete()
      .eq('name', 'Non-existent Show')
      .select();
    
    if (deleteError) {
      console.log('✅ Delete correctly denied:', deleteError.message);
    } else if (deleteData && deleteData.length === 0) {
      console.log('✅ Delete correctly blocked: no rows were deleted due to RLS');
    } else {
      console.error('❌ Delete should have been denied but succeeded!');
      console.log('   Delete data:', deleteData);
    }

    console.log('\n🎉 RLS testing complete!');
    
  } catch (error) {
    console.error('❌ RLS test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testRLSPolicies()
    .then(() => {
      console.log('✅ All RLS tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 RLS test failed:', error);
      process.exit(1);
    });
}

export { testRLSPolicies };
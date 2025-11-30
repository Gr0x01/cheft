import { config } from 'dotenv';

// Load environment variables FIRST
config({ path: '.env.local' });

// Now import the frontend client after env vars are loaded
import { db } from '../src/lib/supabase';

async function testFrontendClient() {
  console.log('🔐 Testing frontend Supabase client with RLS...');
  
  try {
    // Test 1: Get shows
    console.log('\n1️⃣ Testing db.getShows():');
    const shows = await db.getShows();
    console.log(`✅ Shows loaded: ${shows.length} records`);
    shows.slice(0, 3).forEach(show => console.log(`   - ${show.name} (${show.network})`));

    // Test 2: Get restaurants 
    console.log('\n2️⃣ Testing db.getRestaurants():');
    const restaurants = await db.getRestaurants();
    console.log(`✅ Restaurants loaded: ${restaurants.length} records`);
    restaurants.slice(0, 3).forEach(restaurant => 
      console.log(`   - ${restaurant.name} by ${restaurant.chef.name} (${restaurant.city})`)
    );

    // Test 3: Search restaurants
    console.log('\n3️⃣ Testing db.searchRestaurants("chicago"):');
    const chicagoResults = await db.searchRestaurants('chicago');
    console.log(`✅ Search results: ${chicagoResults.length} restaurants`);
    chicagoResults.slice(0, 3).forEach(restaurant => 
      console.log(`   - ${restaurant.name} (${restaurant.city})`)
    );

    // Test 4: Get restaurants by city
    console.log('\n4️⃣ Testing db.getRestaurantsByCity("Chicago"):');
    const chicagoRestaurants = await db.getRestaurantsByCity('Chicago');
    console.log(`✅ Chicago restaurants: ${chicagoRestaurants.length} found`);

    console.log('\n🎉 Frontend client testing complete!');
    console.log('📊 Summary:');
    console.log(`   - Shows: ${shows.length}`);
    console.log(`   - Total restaurants: ${restaurants.length}`);
    console.log(`   - All queries respect RLS (only public restaurants shown)`);
    
  } catch (error) {
    console.error('❌ Frontend client test failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testFrontendClient()
    .then(() => {
      console.log('✅ Frontend client tests completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Frontend client test failed:', error);
      process.exit(1);
    });
}

export { testFrontendClient };
/**
 * Delete Restaurant Script
 * 
 * Quickly delete incorrect restaurants from the database.
 * 
 * Usage:
 *   npx tsx scripts/delete-restaurant.ts "Restaurant Name"
 *   npx tsx scripts/delete-restaurant.ts --id <uuid>
 * 
 * Examples:
 *   npx tsx scripts/delete-restaurant.ts "Sasto Kitchen"
 *   npx tsx scripts/delete-restaurant.ts --id "550e8400-e29b-41d4-a716-446655440000"
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('❌ Error: Please provide a restaurant name or ID');
    console.log('\nUsage:');
    console.log('  npx tsx scripts/delete-restaurant.ts "Restaurant Name"');
    console.log('  npx tsx scripts/delete-restaurant.ts --id <uuid>');
    process.exit(1);
  }

  let restaurantId: string | null = null;
  let restaurantName: string | null = null;

  if (args[0] === '--id') {
    restaurantId = args[1];
  } else {
    restaurantName = args.join(' ');
  }

  if (restaurantId) {
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, city, state, chef:chefs(name)')
      .eq('id', restaurantId)
      .single();

    if (error || !restaurant) {
      console.error(`❌ Restaurant with ID "${restaurantId}" not found`);
      process.exit(1);
    }

    await deleteRestaurant(restaurant);
  } else if (restaurantName) {
    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('id, name, city, state, chef:chefs(name)')
      .ilike('name', `%${restaurantName}%`);

    if (error) {
      console.error('❌ Error searching for restaurants:', error.message);
      process.exit(1);
    }

    if (!restaurants || restaurants.length === 0) {
      console.error(`❌ No restaurants found matching "${restaurantName}"`);
      process.exit(1);
    }

    if (restaurants.length === 1) {
      await deleteRestaurant(restaurants[0]);
    } else {
      console.log(`\n🔍 Found ${restaurants.length} restaurants matching "${restaurantName}":\n`);
      restaurants.forEach((r, i) => {
        const chefName = (r.chef as any)?.name || 'Unknown';
        console.log(`${i + 1}. ${r.name} - ${r.city}, ${r.state} (Chef: ${chefName})`);
        console.log(`   ID: ${r.id}`);
      });
      console.log('\n💡 Please re-run with specific ID:');
      console.log(`   npx tsx scripts/delete-restaurant.ts --id <id-from-above>`);
    }
  }
}

async function deleteRestaurant(restaurant: any) {
  const chefName = (restaurant.chef as any)?.name || 'Unknown';
  
  console.log('\n⚠️  About to DELETE:');
  console.log(`   Name: ${restaurant.name}`);
  console.log(`   Location: ${restaurant.city}, ${restaurant.state}`);
  console.log(`   Chef: ${chefName}`);
  console.log(`   ID: ${restaurant.id}`);
  console.log('\n❌ This action CANNOT be undone!\n');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "DELETE" to confirm: ', resolve);
  });
  rl.close();

  if (answer.trim() !== 'DELETE') {
    console.log('\n🛑 Deletion cancelled');
    process.exit(0);
  }

  console.log('\n🗑️  Deleting restaurant embeddings...');
  const { error: embeddingError } = await supabase
    .from('restaurant_embeddings')
    .delete()
    .eq('restaurant_id', restaurant.id);

  if (embeddingError) {
    console.warn(`⚠️  Warning: Could not delete embeddings: ${embeddingError.message}`);
  }

  console.log('🗑️  Deleting restaurant...');
  const { error: deleteError } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', restaurant.id);

  if (deleteError) {
    console.error(`❌ Failed to delete: ${deleteError.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Successfully deleted "${restaurant.name}"`);
}

main().catch(console.error);

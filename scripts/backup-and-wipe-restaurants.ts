/**
 * Backup and Wipe Restaurants Script
 * 
 * Creates a backup of all restaurants, then optionally wipes them for fresh re-enrichment.
 * 
 * Usage:
 *   npx tsx scripts/backup-and-wipe-restaurants.ts [--wipe]
 * 
 * Examples:
 *   npx tsx scripts/backup-and-wipe-restaurants.ts          # Backup only
 *   npx tsx scripts/backup-and-wipe-restaurants.ts --wipe   # Backup + wipe
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const args = process.argv.slice(2);
  const shouldWipe = args.includes('--wipe');

  console.log('🔄 Restaurant Backup & Wipe Tool\n');
  
  // Step 1: Fetch all restaurants
  console.log('📥 Fetching all restaurants from database...');
  const { data: restaurants, error: fetchError } = await supabase
    .from('restaurants')
    .select('*')
    .order('name');

  if (fetchError) {
    console.error('❌ Error fetching restaurants:', fetchError.message);
    process.exit(1);
  }

  if (!restaurants || restaurants.length === 0) {
    console.log('⚠️  No restaurants found in database');
    process.exit(0);
  }

  console.log(`✅ Found ${restaurants.length} restaurants\n`);

  // Step 2: Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `restaurants-backup-${timestamp}.json`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`💾 Creating backup at: ${backupFile}`);
  fs.writeFileSync(backupFile, JSON.stringify(restaurants, null, 2));
  console.log(`✅ Backup created successfully (${restaurants.length} restaurants)\n`);

  // Step 3: Create CSV backup too (easier to review)
  const csvFile = path.join(backupDir, `restaurants-backup-${timestamp}.csv`);
  const csvHeaders = 'ID,Name,City,State,Chef ID,Status,Created At,Last Enriched\n';
  const csvRows = restaurants.map(r => 
    `"${r.id}","${r.name}","${r.city || ''}","${r.state || ''}","${r.chef_id || ''}","${r.status || ''}","${r.created_at}","${r.last_enriched_at || ''}"`
  ).join('\n');
  
  fs.writeFileSync(csvFile, csvHeaders + csvRows);
  console.log(`📊 CSV backup created: ${csvFile}\n`);

  if (!shouldWipe) {
    console.log('✅ Backup complete! Restaurants preserved in database.');
    console.log('\n💡 To wipe restaurants after backup, run:');
    console.log('   npx tsx scripts/backup-and-wipe-restaurants.ts --wipe');
    return;
  }

  // Step 4: Confirm wipe
  console.log('⚠️  ========================================');
  console.log('⚠️  WARNING: DESTRUCTIVE ACTION');
  console.log('⚠️  ========================================');
  console.log(`⚠️  About to DELETE all ${restaurants.length} restaurants`);
  console.log('⚠️  Backup saved, but this cannot be undone!');
  console.log('⚠️  ========================================\n');

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Type "WIPE ALL RESTAURANTS" to confirm: ', resolve);
  });
  rl.close();

  if (answer.trim() !== 'WIPE ALL RESTAURANTS') {
    console.log('\n🛑 Wipe cancelled. Restaurants preserved.');
    process.exit(0);
  }

  // Step 5: Delete embeddings first
  console.log('\n🗑️  Deleting restaurant embeddings...');
  const { error: embeddingError } = await supabase
    .from('restaurant_embeddings')
    .delete()
    .neq('restaurant_id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (embeddingError) {
    console.error('⚠️  Warning: Could not delete embeddings:', embeddingError.message);
  } else {
    console.log('✅ Embeddings deleted');
  }

  // Step 6: Delete all restaurants
  console.log('🗑️  Deleting all restaurants...');
  const { error: deleteError } = await supabase
    .from('restaurants')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('❌ Failed to delete restaurants:', deleteError.message);
    console.log('\n💾 Backup is safe at:', backupFile);
    process.exit(1);
  }

  console.log(`\n✅ Successfully deleted all ${restaurants.length} restaurants`);
  console.log(`💾 Backup saved at: ${backupFile}`);
  console.log(`📊 CSV backup at: ${csvFile}`);
  console.log('\n🔄 You can now run re-enrichment to rebuild restaurant data:');
  console.log('   npx tsx scripts/re-enrich-all-chefs.ts --scope=restaurants --batch=20');
}

main().catch(console.error);

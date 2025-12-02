import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function stripMarkdownLinks(text: string): string {
  // Remove markdown-style links: ([text](url))
  return text.replace(/\s*\(\[.*?\]\(.*?\)\)/g, '').trim();
}

function generateSlug(name: string, city?: string): string {
  const cleanName = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (city) {
    const cleanCity = city.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${cleanName}-${cleanCity}`;
  }
  
  return cleanName;
}

async function cleanRestaurantNames() {
  console.log('\n🧹 Cleaning restaurant names with markdown links\n');
  console.log('='.repeat(60) + '\n');

  // Find restaurants with markdown links in names
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, city, slug')
    .or('name.ilike.%[%]%,name.ilike.%http%');

  if (!restaurants || restaurants.length === 0) {
    console.log('✅ No restaurants with bad names found\n');
    return;
  }

  console.log(`Found ${restaurants.length} restaurants to clean:\n`);

  let successCount = 0;
  let failCount = 0;

  for (const restaurant of restaurants) {
    const cleanName = stripMarkdownLinks(restaurant.name);
    const newSlug = generateSlug(cleanName, restaurant.city);

    console.log(`📝 ${restaurant.name}`);
    console.log(`   → ${cleanName}`);
    console.log(`   Slug: ${restaurant.slug} → ${newSlug}`);

    const { error } = await supabase
      .from('restaurants')
      .update({
        name: cleanName,
        slug: newSlug,
      })
      .eq('id', restaurant.id);

    if (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failCount++;
    } else {
      console.log(`   ✅ Updated\n`);
      successCount++;
    }
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Total: ${restaurants.length}\n`);
}

cleanRestaurantNames();

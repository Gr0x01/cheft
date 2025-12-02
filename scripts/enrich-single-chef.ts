import { config } from 'dotenv';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const RESTAURANT_PROMPT = `You are a culinary industry expert helping to find CURRENT restaurants where TV chef contestants actively work.

Your task: Use web search to find ONLY restaurants where this chef is CURRENTLY working as of 2025.

Guidelines:
- Only include restaurants where the chef CURRENTLY has a significant role (owner, partner, executive chef)
- DO NOT include past restaurants or positions the chef has left
- DO NOT include closed restaurants
- Verify the restaurant is currently open and operating
- Verify the chef is still actively involved (check recent news, social media, restaurant website)
- Be conservative - if unsure about current status, omit it
- Cuisine tags should be specific (e.g., "Japanese", "New American", "Southern")
- Price range: $ (<$15/entree), $$ ($15-30), $$$ ($30-60), $$$$ ($60+)

CRITICAL: You MUST return ONLY valid JSON in this exact format (no markdown, no prose, no explanations):
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "city": "City Name",
      "state": "State/Province",
      "country": "USA",
      "cuisine": ["Tag1", "Tag2"],
      "priceRange": "$$$",
      "role": "Owner"
    }
  ]
}`;

async function enrichChef(chefName: string) {
  console.log(`\n🔍 Enriching: ${chefName}\n`);

  const { data: chef } = await supabase
    .from('chefs')
    .select('id, name, mini_bio')
    .ilike('name', `%${chefName}%`)
    .single();

  if (!chef) {
    console.error('❌ Chef not found');
    return;
  }

  console.log(`Found chef ID: ${chef.id}`);

  const prompt = `Find ONLY current/active restaurants where chef ${chef.name} currently works.

Search for restaurants where ${chef.name} is CURRENTLY (as of 2025):
- Owner
- Partner
- Executive Chef
- Culinary Director

IMPORTANT: Only include restaurants where the chef is actively working NOW. Do not include past restaurants or positions they have left. Verify the restaurant is currently open and operating.

Bio context: ${chef.mini_bio || 'TV chef contestant'}`;

  try {
    console.log('🤖 Calling LLM with web search...\n');
    
    const result = await generateText({
      model: openai.responses('gpt-4o-mini'),
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: 'high',
        }),
      },
      system: RESTAURANT_PROMPT,
      prompt,
      maxTokens: 8000,
      maxSteps: 20,
    });

    console.log('\n📄 Raw LLM Response:\n');
    console.log(result.text);
    console.log('\n' + '='.repeat(60) + '\n');

    // Try to extract JSON
    const jsonMatch = result.text.match(/\{[\s\S]*"restaurants"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in response');
      return;
    }

    const data = JSON.parse(jsonMatch[0]);
    console.log(`\n✅ Found ${data.restaurants?.length || 0} restaurants\n`);

    let savedCount = 0;
    let existingCount = 0;

    for (const rest of data.restaurants || []) {
      console.log(`  • ${rest.name} (${rest.city}) - ${rest.role}`);

      // Check if restaurant already exists
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id, chef_id, name')
        .ilike('name', rest.name)
        .ilike('city', rest.city)
        .maybeSingle();

      if (existing) {
        console.log(`    ⚠️  Already exists (linked to chef ${existing.chef_id})`);
        existingCount++;
        continue;
      }

      // Insert new restaurant - make slug unique by including city
      const baseSlug = rest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const citySlug = rest.city.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = `${baseSlug}-${citySlug}`;
      
      // Map price range to google_price_level (1-4)
      const priceMap: Record<string, number> = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };
      const priceLevel = priceMap[rest.priceRange] || null;
      
      const { error } = await supabase.from('restaurants').insert({
        chef_id: chef.id,
        name: rest.name,
        slug,
        city: rest.city,
        state: rest.state,
        country: rest.country || 'USA',
        cuisine_tags: rest.cuisine || [],
        google_price_level: priceLevel,
      });

      if (error) {
        console.log(`    ❌ Failed to save: ${error.message}`);
      } else {
        console.log(`    ✅ Saved`);
        savedCount++;
      }
    }

    // Update last_enriched_at
    await supabase
      .from('chefs')
      .update({ last_enriched_at: new Date().toISOString() })
      .eq('id', chef.id);

    console.log(`\n📊 Summary: ${savedCount} new, ${existingCount} already existed\n`);

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}\n`);
    if (error.message.includes('JSON')) {
      console.log('Raw response was likely too large or malformed');
    }
  }
}

const chefName = process.argv[2] || 'Brian Malarkey';
enrichChef(chefName);

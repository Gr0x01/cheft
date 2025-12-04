import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Chef {
  id: string;
  name: string;
  slug: string;
  mini_bio: string | null;
  photo_url: string | null;
  james_beard_status: string | null;
  instagram_handle: string | null;
  restaurant_count: number;
  shows: Array<{
    show_name: string;
    season: string | null;
    result: string | null;
  }>;
}

interface DuplicatePair {
  chef1: Chef;
  chef2: Chef;
  similarity: number;
  confidence: number;
  reasoning: string;
}

const DuplicateVerificationSchema = z.object({
  isDuplicate: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const MergeStrategySchema = z.object({
  keeperId: z.string().uuid(),
  mergedData: z.object({
    name: z.string(),
    slug: z.string(),
    mini_bio: z.string().nullable(),
    photo_url: z.string().nullable(),
    instagram_handle: z.string().nullable(),
    james_beard_status: z.string().nullable(),
    chef_shows: z.array(z.object({
      show_name: z.string(),
      season: z.string().nullable(),
      result: z.string().nullable(),
      is_primary: z.boolean(),
    })),
  }),
  reasoning: z.string(),
});

function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return 1.0;
  
  const words1 = n1.split(/\s+/);
  const words2 = n2.split(/\s+/);
  
  const commonWords = words1.filter(w => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);
  
  return commonWords / totalWords;
}

async function getAllChefs(): Promise<Chef[]> {
  const { data: chefs, error } = await supabase
    .from('chefs')
    .select(`
      id,
      name,
      slug,
      mini_bio,
      photo_url,
      james_beard_status,
      instagram_handle,
      chef_shows (
        shows (name),
        season,
        result
      )
    `)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch chefs: ${error.message}`);
  }

  const chefsWithCounts = await Promise.all(
    (chefs || []).map(async (chef: any) => {
      const { count } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('chef_id', chef.id)
        .eq('is_public', true);

      return {
        id: chef.id,
        name: chef.name,
        slug: chef.slug,
        mini_bio: chef.mini_bio,
        photo_url: chef.photo_url,
        james_beard_status: chef.james_beard_status,
        instagram_handle: chef.instagram_handle,
        restaurant_count: count || 0,
        shows: (chef.chef_shows || []).map((cs: any) => ({
          show_name: cs.shows?.name || 'Unknown',
          season: cs.season,
          result: cs.result,
        })),
      };
    })
  );

  return chefsWithCounts;
}

async function verifyDuplicateWithLLM(chef1: Chef, chef2: Chef): Promise<{
  isDuplicate: boolean;
  confidence: number;
  reasoning: string;
}> {
  const prompt = `Are these two chef records the same person?

Chef 1:
- Name: ${chef1.name}
- Bio: ${chef1.mini_bio || 'N/A'}
- Restaurants: ${chef1.restaurant_count}
- TV Shows: ${chef1.shows.map(s => `${s.show_name}${s.season ? ' ' + s.season : ''}`).join(', ') || 'None'}
- Instagram: ${chef1.instagram_handle || 'N/A'}

Chef 2:
- Name: ${chef2.name}
- Bio: ${chef2.mini_bio || 'N/A'}
- Restaurants: ${chef2.restaurant_count}
- TV Shows: ${chef2.shows.map(s => `${s.show_name}${s.season ? ' ' + s.season : ''}`).join(', ') || 'None'}
- Instagram: ${chef2.instagram_handle || 'N/A'}

Use web search to verify if these are the same person. Look for:
- Social media profiles
- Restaurant websites
- News articles
- LinkedIn profiles
- Show contestant lists

Return confidence 0.9-1.0 if definitely same person, 0.7-0.9 if likely, <0.7 if uncertain.`;

  const result = await generateText({
    model: openai.responses('gpt-4.1-mini'),
    tools: {
      web_search_preview: openai.tools.webSearchPreview({
        searchContextSize: 'medium',
      }),
    },
    system: `You are an expert at identifying duplicate chef records. Use web search to verify chef identities.
    
Return ONLY valid JSON with this structure:
{
  "isDuplicate": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "Explanation of findings"
}

Do NOT include any other text.`,
    prompt,
    maxTokens: 2000,
    maxSteps: 15,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('LLM did not return valid JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return DuplicateVerificationSchema.parse(parsed);
}

async function generateMergeStrategyWithLLM(
  chef1: Chef,
  chef2: Chef
): Promise<z.infer<typeof MergeStrategySchema>> {
  const prompt = `You are merging two chef records that are the same person. Decide how to combine their data.

Chef A (ID: ${chef1.id}):
- Name: ${chef1.name}
- Slug: ${chef1.slug}
- Bio: ${chef1.mini_bio || 'NULL'}
- Photo: ${chef1.photo_url ? 'YES' : 'NULL'}
- Instagram: ${chef1.instagram_handle || 'NULL'}
- James Beard: ${chef1.james_beard_status || 'NULL'}
- Restaurants: ${chef1.restaurant_count}
- Shows: ${JSON.stringify(chef1.shows)}

Chef B (ID: ${chef2.id}):
- Name: ${chef2.name}
- Slug: ${chef2.slug}
- Bio: ${chef2.mini_bio || 'NULL'}
- Photo: ${chef2.photo_url ? 'YES' : 'NULL'}
- Instagram: ${chef2.instagram_handle || 'NULL'}
- James Beard: ${chef2.james_beard_status || 'NULL'}
- Restaurants: ${chef2.restaurant_count}
- Shows: ${JSON.stringify(chef2.shows)}

Decide:
1. Which chef ID to keep as "keeperId" (usually the one with more restaurants or better data)
2. Best name (most complete/accurate)
3. Best slug
4. Best bio (longest, most informative)
5. Best photo URL
6. Best Instagram handle
7. Best James Beard status
8. Deduplicated list of all TV shows from both chefs
9. Which show should be marked as "is_primary: true" (their most notable appearance)

Return ONLY valid JSON matching this structure:
{
  "keeperId": "uuid-of-chef-a-or-b",
  "mergedData": {
    "name": "Best name",
    "slug": "best-slug",
    "mini_bio": "best bio" or null,
    "photo_url": "best photo url" or null,
    "instagram_handle": "best handle" or null,
    "james_beard_status": "winner/nominated/semifinalist" or null,
    "chef_shows": [
      {"show_name": "Top Chef", "season": "15", "result": "winner", "is_primary": true},
      {"show_name": "Tournament of Champions", "season": "3", "result": "contestant", "is_primary": false}
    ]
  },
  "reasoning": "Explanation of merge decisions"
}`;

  const result = await generateText({
    model: openai.responses('gpt-4.1-mini'),
    system: `You are a data merge expert. Combine duplicate chef records intelligently.
    
Use these rules:
- Keep the most complete data (non-null preferred)
- Prefer longer bios over shorter ones
- Prefer chef with more restaurants as keeper
- Deduplicate TV shows (same show + season = one entry)
- Mark the most prestigious show appearance as primary (winner > finalist > contestant)
- Return ONLY valid JSON, no other text`,
    prompt,
    maxTokens: 3000,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('LLM did not return valid JSON for merge strategy');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return MergeStrategySchema.parse(parsed);
}

async function executeMerge(
  chef1: Chef,
  chef2: Chef,
  strategy: z.infer<typeof MergeStrategySchema>,
  dryRun: boolean
): Promise<void> {
  const keeperId = strategy.keeperId;
  const loserId = keeperId === chef1.id ? chef2.id : chef1.id;
  const keeper = keeperId === chef1.id ? chef1 : chef2;
  const loser = keeperId === chef1.id ? chef2 : chef1;

  console.log(`\n  🔀 Merging: "${loser.name}" (${loser.restaurant_count} restaurants) → "${keeper.name}" (${keeper.restaurant_count} restaurants)`);
  console.log(`     Keeper ID: ${keeperId}`);
  console.log(`     Loser ID: ${loserId}`);
  console.log(`     Reasoning: ${strategy.reasoning}`);

  if (dryRun) {
    console.log(`     [DRY RUN] Would update keeper with: ${JSON.stringify(strategy.mergedData, null, 2)}`);
    console.log(`     [DRY RUN] Would transfer ${loser.restaurant_count} restaurants`);
    console.log(`     [DRY RUN] Would merge ${strategy.mergedData.chef_shows.length} show appearances`);
    console.log(`     [DRY RUN] Would delete chef ${loserId}`);
    return;
  }

  const { data: result, error: mergeError } = await supabase.rpc('merge_duplicate_chefs', {
    p_keeper_id: keeperId,
    p_loser_id: loserId,
    p_merged_name: strategy.mergedData.name,
    p_merged_slug: strategy.mergedData.slug,
    p_merged_bio: strategy.mergedData.mini_bio,
    p_merged_photo_url: strategy.mergedData.photo_url,
    p_merged_instagram: strategy.mergedData.instagram_handle,
    p_merged_james_beard: strategy.mergedData.james_beard_status,
    p_chef_shows: strategy.mergedData.chef_shows as any,
  });

  if (mergeError) {
    throw new Error(`Atomic merge failed: ${mergeError.message}`);
  }

  console.log(`     ✅ Merge complete!`);
  console.log(`     📊 Restaurants transferred: ${result.restaurants_transferred}`);
  console.log(`     📺 Shows inserted: ${result.shows_inserted}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const minConfidence = parseFloat(args.find(arg => arg.startsWith('--min-confidence='))?.split('=')[1] || '0.9');
  const interactive = args.includes('--interactive');

  console.log('🔍 Scanning for duplicate chefs...\n');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Min confidence: ${minConfidence}`);
  console.log(`   Interactive: ${interactive}\n`);

  const chefs = await getAllChefs();
  console.log(`📊 Found ${chefs.length} chefs\n`);

  const potentialDuplicates: DuplicatePair[] = [];

  for (let i = 0; i < chefs.length; i++) {
    for (let j = i + 1; j < chefs.length; j++) {
      const similarity = calculateNameSimilarity(chefs[i].name, chefs[j].name);
      
      if (similarity >= 0.7) {
        console.log(`🔍 Checking: "${chefs[i].name}" vs "${chefs[j].name}" (similarity: ${similarity.toFixed(2)})`);
        
        const verification = await verifyDuplicateWithLLM(chefs[i], chefs[j]);
        
        if (verification.isDuplicate && verification.confidence >= minConfidence) {
          console.log(`   ✅ DUPLICATE CONFIRMED (confidence: ${verification.confidence.toFixed(2)})`);
          console.log(`      ${verification.reasoning}\n`);
          
          potentialDuplicates.push({
            chef1: chefs[i],
            chef2: chefs[j],
            similarity,
            confidence: verification.confidence,
            reasoning: verification.reasoning,
          });
        } else {
          console.log(`   ❌ Not duplicates (confidence: ${verification.confidence.toFixed(2)})\n`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  if (potentialDuplicates.length === 0) {
    console.log('\n✅ No duplicates found!');
    return;
  }

  console.log(`\n\n📋 Found ${potentialDuplicates.length} duplicate pair(s)\n`);

  for (const pair of potentialDuplicates) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`DUPLICATE: "${pair.chef1.name}" ↔ "${pair.chef2.name}"`);
    console.log(`Confidence: ${pair.confidence.toFixed(2)}`);
    console.log(`${pair.reasoning}`);

    const strategy = await generateMergeStrategyWithLLM(pair.chef1, pair.chef2);
    
    await executeMerge(pair.chef1, pair.chef2, strategy, dryRun);
  }

  console.log(`\n\n✅ Processing complete!`);
  console.log(`   Duplicates found: ${potentialDuplicates.length}`);
  console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes made)' : 'LIVE (changes applied)'}`);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

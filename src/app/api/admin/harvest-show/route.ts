import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import {
  verifyAdminAuth,
  createUnauthorizedResponse,
  createBadRequestResponse,
  createServerErrorResponse,
} from '@/lib/auth/admin';

const HarvestShowSchema = z.object({
  showName: z.string().min(2).max(200),
  isNew: z.boolean(),
  showId: z.string().uuid().optional(),
});

interface ChefExtraction {
  name: string;
  seasons?: string[];
  role?: string;
  result?: string;
}

interface RestaurantExtraction {
  name: string;
  city?: string;
  state?: string;
  status?: string;
}

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const TAVILY_RATE_LIMIT_MS = 1000;
let lastTavilyCall = 0;

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&');
}

async function searchTavily(query: string): Promise<{ results: Array<{ title: string; content: string; url: string }> }> {
  if (!TAVILY_API_KEY) {
    throw new Error('TAVILY_API_KEY not configured');
  }

  const now = Date.now();
  const timeSinceLastCall = now - lastTavilyCall;
  if (timeSinceLastCall < TAVILY_RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, TAVILY_RATE_LIMIT_MS - timeSinceLastCall));
  }
  lastTavilyCall = Date.now();

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: 10,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  return response.json();
}

async function extractChefsFromSearch(searchResults: string, showName: string): Promise<ChefExtraction[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `Extract chef names from these search results about "${showName}" TV show contestants/winners.

Return JSON array of objects with: name (string), seasons (array of strings like "Season 1" or "2021"), role (contestant/winner/judge), result (winner/finalist/eliminated/judge)

Only include actual chefs who appeared on the show. Exclude judges unless they were also contestants.

Search results:
${searchResults}

Return ONLY valid JSON array, no explanation:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';
  
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse chef extraction:', content);
    return [];
  }
}

async function extractRestaurantsForChef(searchResults: string, chefName: string): Promise<RestaurantExtraction[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const prompt = `Extract restaurants owned/operated by chef "${chefName}" from these search results.

Return JSON array of objects with: name (string), city (string), state (string, 2-letter code for US), status (open/closed/unknown)

Only include restaurants where this chef is owner, partner, or executive chef. Skip restaurants where they just worked briefly.

Search results:
${searchResults}

Return ONLY valid JSON array, no explanation:`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';
  
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse restaurant extraction:', content);
    return [];
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  
  if (!authResult.authorized) {
    return createUnauthorizedResponse(authResult.error);
  }

  try {
    const body = await request.json();
    const validated = HarvestShowSchema.parse(body);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return createServerErrorResponse('Server configuration error');
    }
    
    const supabase = createClient<Database>(supabaseUrl, supabaseKey);

    const errors: string[] = [];
    let chefsFound = 0;
    let restaurantsFound = 0;
    let discoveriesCreated = 0;
    let estimatedCost = 0;

    console.log(`[Harvest] Starting harvest for show: ${validated.showName}`);

    const showQuery = `"${validated.showName}" TV show chef contestants winners seasons`;
    const showSearchResults = await searchTavily(showQuery);
    estimatedCost += 0.008;

    const searchText = showSearchResults.results
      .map(r => `${r.title}\n${r.content}`)
      .join('\n\n');

    const chefs = await extractChefsFromSearch(searchText, validated.showName);
    estimatedCost += 0.01;
    chefsFound = chefs.length;

    console.log(`[Harvest] Found ${chefsFound} chefs from show search`);

    if (validated.isNew && chefs.length > 0) {
      const { error: showInsertError } = await supabase
        .from('pending_discoveries')
        .insert({
          discovery_type: 'show',
          source_chef_name: null,
          data: {
            name: validated.showName,
            chefs_found: chefsFound,
            source: 'tavily_harvest',
          },
          status: 'pending',
        });

      if (!showInsertError) {
        discoveriesCreated++;
      } else {
        errors.push(`Failed to stage show: ${showInsertError.message}`);
      }
    }

    for (const chef of chefs) {
      const { data: existingChef } = await supabase
        .from('chefs')
        .select('id, name')
        .ilike('name', `%${escapeLikePattern(chef.name)}%`)
        .maybeSingle();

      if (existingChef) {
        console.log(`[Harvest] Skipping existing chef: ${chef.name}`);
        continue;
      }

      const { error: chefInsertError } = await supabase
        .from('pending_discoveries')
        .insert({
          discovery_type: 'chef',
          source_chef_name: null,
          data: {
            name: chef.name,
            show_name: validated.showName,
            seasons: chef.seasons,
            role: chef.role,
            result: chef.result,
            source: 'tavily_harvest',
          },
          status: 'pending',
        });

      if (!chefInsertError) {
        discoveriesCreated++;
      } else {
        errors.push(`Failed to stage chef ${chef.name}: ${chefInsertError.message}`);
      }

      const restaurantQuery = `"${chef.name}" chef restaurants owner locations`;
      try {
        const restaurantSearchResults = await searchTavily(restaurantQuery);
        estimatedCost += 0.008;

        const restaurantText = restaurantSearchResults.results
          .map(r => `${r.title}\n${r.content}`)
          .join('\n\n');

        const restaurants = await extractRestaurantsForChef(restaurantText, chef.name);
        estimatedCost += 0.006;
        restaurantsFound += restaurants.length;

        for (const restaurant of restaurants) {
          const { data: existingRestaurant } = await supabase
            .from('restaurants')
            .select('id')
            .ilike('name', `%${escapeLikePattern(restaurant.name)}%`)
            .eq('city', restaurant.city || '')
            .maybeSingle();

          if (existingRestaurant) {
            console.log(`[Harvest] Skipping existing restaurant: ${restaurant.name}`);
            continue;
          }

          const { error: restInsertError } = await supabase
            .from('pending_discoveries')
            .insert({
              discovery_type: 'restaurant',
              source_chef_name: chef.name,
              data: {
                name: restaurant.name,
                city: restaurant.city,
                state: restaurant.state,
                status: restaurant.status,
                chef_name: chef.name,
                source: 'tavily_harvest',
              },
              status: 'pending',
            });

          if (!restInsertError) {
            discoveriesCreated++;
          } else {
            errors.push(`Failed to stage restaurant ${restaurant.name}: ${restInsertError.message}`);
          }
        }
      } catch (err) {
        errors.push(`Restaurant search failed for ${chef.name}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Harvest] Complete: ${chefsFound} chefs, ${restaurantsFound} restaurants, ${discoveriesCreated} discoveries, $${estimatedCost.toFixed(3)} cost`);

    return NextResponse.json({
      chefsFound,
      restaurantsFound,
      discoveriesCreated,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      errors,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createBadRequestResponse('Invalid request', error.errors);
    }

    console.error('[Harvest] Error:', error);
    return createServerErrorResponse(
      'Harvest failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

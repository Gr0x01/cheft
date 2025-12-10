import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const DuplicateCheckSchema = z.object({
  isDuplicate: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  confidence: number;
  reasoning: string;
}

export interface RestaurantComparison {
  name1: string;
  name2: string;
  city: string;
  address1?: string | null;
  address2?: string | null;
  state?: string | null;
  rating1?: number | null;
  rating2?: number | null;
  reviewCount1?: number | null;
  reviewCount2?: number | null;
}

const DUPLICATE_DETECTION_SYSTEM_PROMPT = `You are a restaurant data analyst helping to identify duplicate restaurant entries in a database.

Your task: Compare two restaurant names and determine if they refer to the SAME physical restaurant location.

Guidelines:
- Same restaurant with slightly different names = DUPLICATE (e.g., "Aba" vs "Aba Chicago", "1 Kitchen" vs "1 Kitchen by Chris Crary")
- Same restaurant name in DIFFERENT cities = NOT DUPLICATE (e.g., "Aba Austin" vs "Aba Chicago")
- Different restaurants with similar names = NOT DUPLICATE (e.g., "221 South Oak" vs "221 South Oak Bistro" could be different)
- Check addresses if provided - different addresses in same city usually means different locations
- Use Google ratings and review counts as strong signals:
  * Similar ratings and review counts = likely the same restaurant
  * Very different review counts (e.g., 500 vs 50) = likely different locations
  * One has rating/reviews, other doesn't = likely one is verified, other is unverified duplicate
- Consider context: chains, franchise locations, sister restaurants

Confidence levels:
- 0.95+: Definitely the same restaurant (minor name variation + similar ratings/reviews)
- 0.8-0.95: Very likely the same (needs address or rating confirmation)
- 0.5-0.8: Possibly the same (ambiguous)
- <0.5: Probably different restaurants`;

export async function checkForDuplicate(
  comparison: RestaurantComparison
): Promise<DuplicateCheckResult> {
  const { name1, name2, city, address1, address2, state, rating1, rating2, reviewCount1, reviewCount2 } = comparison;

  const location = state ? `${city}, ${state}` : city;
  const addr1 = address1 ? ` at "${address1}"` : '';
  const addr2 = address2 ? ` at "${address2}"` : '';
  
  const rating1Text = rating1 ? ` (${rating1}★, ${reviewCount1 || 0} reviews)` : '';
  const rating2Text = rating2 ? ` (${rating2}★, ${reviewCount2 || 0} reviews)` : '';

  const prompt = `Compare these two restaurants in ${location}:

Restaurant A: "${name1}"${addr1}${rating1Text}
Restaurant B: "${name2}"${addr2}${rating2Text}

Are these the same restaurant? Consider name variations, addresses, ratings, and review counts.`;

  try {
    const result = await generateObject({
      model: openai('gpt-4.1-nano'),
      system: DUPLICATE_DETECTION_SYSTEM_PROMPT,
      prompt,
      schema: DuplicateCheckSchema,
      maxTokens: 500,
    });

    return {
      isDuplicate: result.object.isDuplicate,
      confidence: result.object.confidence,
      reasoning: result.object.reasoning,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Duplicate detection error: ${msg}`);
    
    return {
      isDuplicate: false,
      confidence: 0,
      reasoning: `Error during detection: ${msg}`,
    };
  }
}

export async function checkMultipleDuplicates(
  comparisons: RestaurantComparison[]
): Promise<DuplicateCheckResult[]> {
  const results = await Promise.all(
    comparisons.map(comp => checkForDuplicate(comp))
  );
  return results;
}

export function normalizeRestaurantName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/[''`]/g, "'")
    .replace(/[""]/g, '"')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .trim();
}

export function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeRestaurantName(name1);
  const norm2 = normalizeRestaurantName(name2);

  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;

  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);

  return intersection.length / union.size;
}

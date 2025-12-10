import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';


export interface ChefFilterResult {
  isChef: boolean;
  reason: string;
  confidence: number;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ChefCandidate {
  name: string;
  showName: string;
  season?: string | null;
  result?: string | null;
  hometown?: string | null;
}

const FILTER_SYSTEM_PROMPT = `You are an expert at identifying TV cooking competition contestants who are professional chefs with their own restaurants.

Your task: Determine if the given person is a CHEF WITH RESTAURANTS (someone who owns, operates, or is executive chef at restaurants) vs NON-CHEF (producers, judges-only, crew, hosts, or contestants who never opened restaurants).

Guidelines:
- Most Top Chef contestants ARE professional chefs - lean toward isChef: true unless you have specific knowledge they're not
- Judges like Tom Colicchio, Gail Simmons ARE chefs with restaurants
- Hosts like Padma Lakshmi are NOT chefs (isChef: false)
- Producers, camera crew, etc. are NOT chefs
- If unsure, set confidence lower (0.5-0.7) but still make a decision
- Winners and finalists almost always have restaurants (high confidence true)`;

const ChefFilterSchema = z.object({
  isChef: z.boolean(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`   ⚠️ Retry ${attempt}/${MAX_RETRIES} for "${context}" after ${Math.round(delay)}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function filterChefCandidate(candidate: ChefCandidate): Promise<ChefFilterResult> {
  const userPrompt = `Is this person a chef with restaurants?

Name: ${candidate.name}
Show: ${candidate.showName}
${candidate.season ? `Season: ${candidate.season}` : ''}
${candidate.result ? `Result: ${candidate.result}` : ''}
${candidate.hometown ? `Hometown: ${candidate.hometown}` : ''}`;

  try {
    const { object, usage } = await withRetry(
      () => generateObject({
        model: openai('gpt-5-nano'),
        schema: ChefFilterSchema,
        system: FILTER_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.1,
      }),
      candidate.name
    );

    return {
      isChef: object.isChef,
      reason: object.reason,
      confidence: object.confidence,
      tokensUsed: {
        prompt: usage?.promptTokens || 0,
        completion: usage?.completionTokens || 0,
        total: usage?.totalTokens || 0,
      }
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`   ❌ LLM filter error for "${candidate.name}" after ${MAX_RETRIES} retries: ${msg}`);
    
    return {
      isChef: false,
      reason: `LLM error after ${MAX_RETRIES} retries, excluding: ${msg}`,
      confidence: 0,
      tokensUsed: { prompt: 0, completion: 0, total: 0 }
    };
  }
}

export async function filterChefCandidatesBatch(
  candidates: ChefCandidate[],
  options: { delayMs?: number; concurrency?: number } = {}
): Promise<Map<string, ChefFilterResult>> {
  const results = new Map<string, ChefFilterResult>();
  const delayMs = options.delayMs ?? 100;
  const concurrency = options.concurrency ?? 5;
  
  const queue = [...candidates];
  const inFlight = new Set<Promise<void>>();
  
  while (queue.length > 0 || inFlight.size > 0) {
    while (inFlight.size < concurrency && queue.length > 0) {
      const candidate = queue.shift()!;
      
      const task = (async () => {
        const result = await filterChefCandidate(candidate);
        results.set(candidate.name, result);
        
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      })();
      
      inFlight.add(task);
      task.finally(() => inFlight.delete(task));
    }
    
    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }
  }

  return results;
}

export function estimateFilterCost(tokenCount: number): number {
  const inputCostPer1M = 0.05;
  const outputCostPer1M = 0.40;
  const avgInputRatio = 0.8;
  
  const inputTokens = tokenCount * avgInputRatio;
  const outputTokens = tokenCount * (1 - avgInputRatio);
  
  return (inputTokens / 1_000_000) * inputCostPer1M + 
         (outputTokens / 1_000_000) * outputCostPer1M;
}

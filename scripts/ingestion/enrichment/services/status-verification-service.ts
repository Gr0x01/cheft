import { z } from 'zod';
import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { parseAndValidate } from '../shared/result-parser';
import { withRetry } from '../shared/retry-handler';

const RestaurantStatusSchema = z.object({
  status: z.enum(['open', 'closed', 'unknown']),
  confidence: z.number(),
  reason: z.string(),
});

export interface RestaurantStatusResult {
  restaurantId: string;
  restaurantName: string;
  status: 'open' | 'closed' | 'unknown';
  confidence: number;
  reason: string;
  tokensUsed: TokenUsage;
  success: boolean;
  error?: string;
}

const RESTAURANT_STATUS_SYSTEM_PROMPT = `You are a restaurant industry analyst verifying whether restaurants are currently open.

Your task: Search for current information about the restaurant to determine if it's still operating.

Guidelines:
- Look for recent reviews, social media activity, or news articles
- A restaurant is "closed" if there's clear evidence it shut down
- A restaurant is "open" if there's recent activity (within 6 months)
- Mark as "unknown" if you can't find conclusive information
- Confidence: 0.9+ for clear evidence, 0.7-0.9 for likely, <0.7 for uncertain

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text or anything other than the JSON object itself.

Your response must be a single JSON object matching this exact structure:
{
  "status": "open" or "closed" or "unknown",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation of findings"
}

Do NOT start your response with "I can..." or any other text. Start immediately with the opening brace {.`;

export class StatusVerificationService {
  constructor(
    private llmClient: LLMClient,
    private tokenTracker: TokenTracker
  ) {}

  async verifyStatus(
    restaurantId: string,
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string
  ): Promise<RestaurantStatusResult> {
    const prompt = this.buildStatusVerificationPrompt(restaurantName, chefName, city, state);

    try {
      const result = await withRetry(
        () => this.llmClient.generateWithWebSearch(
          RESTAURANT_STATUS_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 4000, searchContextSize: 'low' }
        ),
        `verify status ${restaurantName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      const validated = parseAndValidate(result.text, RestaurantStatusSchema);

      return {
        restaurantId,
        restaurantName,
        status: validated.status,
        confidence: validated.confidence,
        reason: validated.reason,
        tokensUsed,
        success: true,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Status verification error for "${restaurantName}": ${msg}`);
      
      return {
        restaurantId,
        restaurantName,
        status: 'unknown',
        confidence: 0,
        reason: `Error: ${msg}`,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: msg,
      };
    }
  }

  private buildStatusVerificationPrompt(
    restaurantName: string,
    chefName: string,
    city: string,
    state?: string
  ): string {
    const location = state ? `${city}, ${state}` : city;
    
    return `Verify if "${restaurantName}" by chef ${chefName} in ${location} is currently open.

Search for:
- Recent reviews or social media posts
- News about closure or relocation
- Current operating hours or website status

Determine if the restaurant is open, closed, or unknown.`;
  }
}

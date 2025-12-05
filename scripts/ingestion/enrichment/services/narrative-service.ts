import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { withRetry } from '../shared/retry-handler';

export interface NarrativeResult {
  success: boolean;
  narrative: string | null;
  tokensUsed: TokenUsage;
  error?: string;
}

export class NarrativeService {
  constructor(
    private tokenTracker: TokenTracker
  ) {}

  async generateChefNarrative(
    chefId: string,
    chefContext: any
  ): Promise<NarrativeResult> {
    try {
      const { buildChefNarrativePrompt, CHEF_NARRATIVE_SYSTEM_PROMPT } = await import('../../../../src/lib/narratives/prompts');
      
      const prompt = buildChefNarrativePrompt(chefContext);
      
      const narrativeClient = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => narrativeClient.generateWithWebSearch(
          CHEF_NARRATIVE_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, maxSteps: 50, searchContextSize: 'medium' }
        ),
        `generate narrative for chef ${chefContext.name}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty narrative');
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        throw new Error(`Generated narrative too short: ${narrative.length} characters`);
      }

      return {
        success: true,
        narrative,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Narrative generation error: ${msg}`);
      
      return {
        success: false,
        narrative: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async generateRestaurantNarrative(
    restaurantId: string,
    restaurantContext: any
  ): Promise<NarrativeResult> {
    try {
      const { buildRestaurantNarrativePrompt, RESTAURANT_NARRATIVE_SYSTEM_PROMPT } = await import('../../../../src/lib/narratives/prompts');
      
      const prompt = buildRestaurantNarrativePrompt(restaurantContext);
      
      const narrativeClient = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => narrativeClient.generateWithWebSearch(
          RESTAURANT_NARRATIVE_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 6000, maxSteps: 30, searchContextSize: 'medium' }
        ),
        `generate narrative for restaurant ${restaurantContext.name}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty narrative');
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        throw new Error(`Generated narrative too short: ${narrative.length} characters`);
      }

      return {
        success: true,
        narrative,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Restaurant narrative error: ${msg}`);
      
      return {
        success: false,
        narrative: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async generateCityNarrative(
    cityId: string,
    cityContext: any
  ): Promise<NarrativeResult> {
    try {
      const { buildCityNarrativePrompt, CITY_NARRATIVE_SYSTEM_PROMPT } = await import('../../../../src/lib/narratives/prompts');
      
      const prompt = buildCityNarrativePrompt(cityContext);
      
      const narrativeClient = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => narrativeClient.generateWithWebSearch(
          CITY_NARRATIVE_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 8000, maxSteps: 40, searchContextSize: 'medium' }
        ),
        `generate narrative for city ${cityContext.name}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty narrative');
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        throw new Error(`Generated narrative too short: ${narrative.length} characters`);
      }

      return {
        success: true,
        narrative,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ City narrative error: ${msg}`);
      
      return {
        success: false,
        narrative: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }
}

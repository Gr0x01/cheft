import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { synthesizeRaw } from '../shared/synthesis-client';

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
    console.log(`   📖 Generating narrative for chef ${chefContext.name}`);

    try {
      const { buildChefNarrativePrompt, CHEF_NARRATIVE_SYSTEM_PROMPT } = await import('../../../../src/lib/narratives/prompts');

      const prompt = buildChefNarrativePrompt(chefContext);

      const result = await synthesizeRaw('creative', CHEF_NARRATIVE_SYSTEM_PROMPT, prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.usage,
          error: `Generated narrative too short: ${narrative.length} characters`,
        };
      }

      return {
        success: true,
        narrative,
        tokensUsed: result.usage,
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
    console.log(`   📖 Generating narrative for restaurant ${restaurantContext.name}`);

    try {
      const { buildRestaurantNarrativePrompt, RESTAURANT_NARRATIVE_SYSTEM_PROMPT } = await import('../../../../src/lib/narratives/prompts');

      const prompt = buildRestaurantNarrativePrompt(restaurantContext);

      const result = await synthesizeRaw('creative', RESTAURANT_NARRATIVE_SYSTEM_PROMPT, prompt, {
        maxTokens: 1500,
        temperature: 0.7,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.usage,
          error: `Generated narrative too short: ${narrative.length} characters`,
        };
      }

      return {
        success: true,
        narrative,
        tokensUsed: result.usage,
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
    console.log(`   📖 Generating narrative for city ${cityContext.name}`);

    try {
      const { buildCityNarrativePrompt, CITY_NARRATIVE_SYSTEM_PROMPT } = await import('../../../../src/lib/narratives/prompts');

      const prompt = buildCityNarrativePrompt(cityContext);

      const result = await synthesizeRaw('creative', CITY_NARRATIVE_SYSTEM_PROMPT, prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      this.tokenTracker.trackUsage(result.usage);

      if (!result.success) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.usage,
          error: result.error,
        };
      }

      const narrative = result.text.trim();

      if (narrative.length < 50) {
        return {
          success: false,
          narrative: null,
          tokensUsed: result.usage,
          error: `Generated narrative too short: ${narrative.length} characters`,
        };
      }

      return {
        success: true,
        narrative,
        tokensUsed: result.usage,
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

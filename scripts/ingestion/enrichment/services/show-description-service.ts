import { LLMClient } from '../shared/llm-client';
import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { withRetry } from '../shared/retry-handler';
import { ShowRepository } from '../repositories/show-repository';

export interface ShowDescriptionResult {
  success: boolean;
  description: string | null;
  tokensUsed: TokenUsage;
  error?: string;
}

export interface SeasonContext {
  showName: string;
  season: string;
  network: string | null;
  winner: { name: string; chefId: string } | null;
  chefCount: number;
  restaurantCount: number;
}

export class ShowDescriptionService {
  constructor(
    private tokenTracker: TokenTracker,
    private showRepo: ShowRepository
  ) {}

  async ensureShowDescription(
    showId: string,
    showName: string,
    network: string | null
  ): Promise<ShowDescriptionResult> {
    const existing = await this.showRepo.getShowDescription(showId);
    
    if (existing) {
      console.log(`   ✓ Show description already exists, skipping`);
      return {
        success: true,
        description: existing,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    console.log(`   🎬 Generating SEO description for ${showName}...`);
    return this.generateShowDescription(showId, showName, network);
  }

  async ensureSeasonDescription(
    showId: string,
    season: string,
    context: SeasonContext
  ): Promise<ShowDescriptionResult> {
    const existing = await this.showRepo.getSeasonDescription(showId, season);
    
    if (existing) {
      console.log(`   ✓ Season description already exists, skipping`);
      return {
        success: true,
        description: existing,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
      };
    }

    console.log(`   🎬 Generating SEO description for ${context.showName} ${season}...`);
    return this.generateSeasonDescription(showId, season, context);
  }

  async generateShowDescription(
    showId: string,
    showName: string,
    network: string | null
  ): Promise<ShowDescriptionResult> {
    try {
      const { SHOW_DESCRIPTION_SYSTEM_PROMPT, buildShowDescriptionPrompt } = await import('../../../../src/lib/narratives/prompts');
      
      const prompt = buildShowDescriptionPrompt({ name: showName, network });
      
      const client = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => client.generateWithWebSearch(
          SHOW_DESCRIPTION_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 500, maxSteps: 20, searchContextSize: 'low' }
        ),
        `generate show description for ${showName}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty description');
      }

      const description = result.text.trim();

      if (description.length < 30) {
        throw new Error(`Generated description too short: ${description.length} characters`);
      }

      await this.showRepo.saveShowDescription(showId, description);
      console.log(`   ✅ Show description saved (${description.length} chars)`);

      return {
        success: true,
        description,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Show description error: ${msg}`);
      
      return {
        success: false,
        description: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }

  async generateSeasonDescription(
    showId: string,
    season: string,
    context: SeasonContext
  ): Promise<ShowDescriptionResult> {
    try {
      const { SEASON_DESCRIPTION_SYSTEM_PROMPT, buildSeasonDescriptionPrompt } = await import('../../../../src/lib/narratives/prompts');
      
      const prompt = buildSeasonDescriptionPrompt(context);
      
      const client = new LLMClient({ model: 'gpt-4.1-mini' });
      const result = await withRetry(
        () => client.generateWithWebSearch(
          SEASON_DESCRIPTION_SYSTEM_PROMPT,
          prompt,
          { maxTokens: 400, maxSteps: 15, searchContextSize: 'low' }
        ),
        `generate season description for ${context.showName} ${season}`
      );

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.text || result.text.trim() === '') {
        throw new Error('LLM returned empty description');
      }

      const description = result.text.trim();

      if (description.length < 20) {
        throw new Error(`Generated description too short: ${description.length} characters`);
      }

      await this.showRepo.saveSeasonDescription(showId, season, description);
      console.log(`   ✅ Season description saved (${description.length} chars)`);

      return {
        success: true,
        description,
        tokensUsed,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Season description error: ${msg}`);
      
      return {
        success: false,
        description: null,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        error: msg,
      };
    }
  }
}

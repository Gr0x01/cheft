import { TokenTracker, TokenUsage } from '../shared/token-tracker';
import { ShowRepository } from '../repositories/show-repository';
import { searchTavily, TavilyResult } from '../shared/tavily-client';
import { synthesizeRaw } from '../shared/synthesis-client';

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
      const query = `${showName} TV show format history impact`;
      console.log(`      🔍 Searching: "${query}"`);
      
      const searchResponse = await searchTavily(query, {
        entityType: 'show',
        maxResults: 5,
      });

      const searchContext = searchResponse.results
        .map((r: TavilyResult) => `[${r.title}]\n${r.content}`)
        .join('\n\n');

      const systemPrompt = `You write concise SEO-friendly descriptions for TV cooking competition show pages.
Write 2-3 sentences that:
- Describe the show format and what makes it unique
- Mention the network and premiere year if known
- Appeal to fans looking to explore chefs from this show

Be factual and engaging. No fluff or filler phrases.`;

      const userPrompt = `Write a brief SEO description for the TV show "${showName}"${network ? ` on ${network}` : ''}.

Research context:
${searchContext}

Write 2-3 sentences only. No headers or formatting.`;

      const result = await synthesizeRaw('creative', systemPrompt, userPrompt, {
        maxTokens: 200,
        temperature: 0.7,
      });

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.success || !result.text || result.text.trim() === '') {
        throw new Error(result.error || 'LLM returned empty description');
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
      const query = `${context.showName} season ${season} contestants winner`;
      console.log(`      🔍 Searching: "${query}"`);
      
      const searchResponse = await searchTavily(query, {
        entityType: 'show',
        maxResults: 3,
      });

      const searchContext = searchResponse.results
        .map((r: TavilyResult) => `[${r.title}]\n${r.content}`)
        .join('\n\n');

      const systemPrompt = `You write concise SEO-friendly descriptions for TV cooking competition season pages.
Write 1-2 sentences that:
- Mention the season number and any notable theme/location
- Reference the winner if known
- Create interest in exploring the chefs from this season

Be factual and engaging. No fluff.`;

      const winnerInfo = context.winner 
        ? `The winner was ${context.winner.name}.` 
        : '';
      
      const statsInfo = context.chefCount > 0 
        ? `This season has ${context.chefCount} chef${context.chefCount > 1 ? 's' : ''} in our database.`
        : '';

      const userPrompt = `Write a brief SEO description for Season ${context.season} of ${context.showName}${context.network ? ` on ${context.network}` : ''}.

${winnerInfo}
${statsInfo}

Research context:
${searchContext}

Write 1-2 sentences only. No headers or formatting.`;

      const result = await synthesizeRaw('creative', systemPrompt, userPrompt, {
        maxTokens: 150,
        temperature: 0.7,
      });

      const tokensUsed: TokenUsage = result.usage;
      this.tokenTracker.trackUsage(tokensUsed);

      if (!result.success || !result.text || result.text.trim() === '') {
        throw new Error(result.error || 'LLM returned empty description');
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

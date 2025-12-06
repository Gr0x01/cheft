import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export interface LLMClientConfig {
  model?: string;
  searchModel?: string;
  maxTokens?: number;
  maxSteps?: number;
  searchContextSize?: 'low' | 'medium' | 'high';
}

export interface LLMResponse {
  text: string;
  usage: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: string;
  steps?: unknown[];
}

export class LLMClient {
  private model: string;
  private searchModel: string;
  private searchTokens: { prompt: number; completion: number; total: number };

  constructor(config: LLMClientConfig = {}) {
    this.model = config.model ?? 'gpt-4.1';
    this.searchModel = config.searchModel ?? 'gpt-4o-search-preview';
    this.searchTokens = { prompt: 0, completion: 0, total: 0 };
  }

  private async webSearch(query: string): Promise<string> {
    const result = await generateText({
      model: openai(this.searchModel),
      messages: [
        { role: 'user', content: query },
      ],
      maxTokens: 4000,
    });
    this.searchTokens.prompt += result.usage?.promptTokens || 0;
    this.searchTokens.completion += result.usage?.completionTokens || 0;
    this.searchTokens.total += result.usage?.totalTokens || 0;
    return result.text;
  }

  resetSearchTokens(): void {
    this.searchTokens = { prompt: 0, completion: 0, total: 0 };
  }

  async generateWithWebSearch(
    system: string,
    prompt: string,
    options: {
      maxTokens?: number;
      maxSteps?: number;
      searchContextSize?: 'low' | 'medium' | 'high';
      useResponseModel?: boolean;
    } = {}
  ): Promise<LLMResponse> {
    const maxTokens = options.maxTokens ?? 8000;
    const maxSteps = options.maxSteps ?? 10;

    const result = await generateText({
      model: openai(this.model),
      system,
      prompt,
      tools: {
        webSearch: tool({
          description: 'Search the web for current information. Use this to find TV show appearances, chef information, restaurant details, etc.',
          parameters: z.object({
            query: z.string().describe('The search query'),
          }),
          execute: async ({ query }) => {
            console.log(`      🔍 Searching: "${query}"`);
            return await this.webSearch(query);
          },
        }),
      },
      maxSteps,
      maxTokens,
    });

    const searchCount = result.steps?.filter((s: any) => s.toolCalls?.length > 0).length || 0;
    if (searchCount > 0) {
      console.log(`      🔍 Performed ${searchCount} web searches`);
    }

    const orchestratorTokens = {
      prompt: result.usage?.promptTokens || 0,
      completion: result.usage?.completionTokens || 0,
      total: result.usage?.totalTokens || 0,
    };

    const combinedUsage = {
      prompt: orchestratorTokens.prompt + this.searchTokens.prompt,
      completion: orchestratorTokens.completion + this.searchTokens.completion,
      total: orchestratorTokens.total + this.searchTokens.total,
    };

    this.resetSearchTokens();

    return {
      text: result.text,
      usage: combinedUsage,
      finishReason: result.finishReason,
      steps: result.steps,
    };
  }

  getModel(): string {
    return this.model;
  }

  getSearchModel(): string {
    return this.searchModel;
  }
}

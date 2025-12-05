import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export interface LLMClientConfig {
  model?: string;
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

async function webSearch(query: string): Promise<string> {
  const result = await generateText({
    model: openai('gpt-4o-mini-search-preview'),
    messages: [
      { role: 'user', content: query },
    ],
    maxTokens: 4000,
  });
  return result.text;
}

export class LLMClient {
  private model: string;

  constructor(config: LLMClientConfig = {}) {
    this.model = config.model ?? 'gpt-4o-mini';
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
            return await webSearch(query);
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

    return {
      text: result.text,
      usage: {
        prompt: result.usage?.promptTokens || 0,
        completion: result.usage?.completionTokens || 0,
        total: result.usage?.totalTokens || 0,
      },
      finishReason: result.finishReason,
      steps: result.steps,
    };
  }

  getModel(): string {
    return this.model;
  }
}

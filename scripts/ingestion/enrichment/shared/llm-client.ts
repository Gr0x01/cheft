import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

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

export class LLMClient {
  private model: string;

  constructor(config: LLMClientConfig = {}) {
    this.model = config.model ?? 'gpt-5-mini';
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
    const searchContextSize = options.searchContextSize ?? 'medium';
    const useResponseModel = options.useResponseModel ?? true;

    const modelProvider = useResponseModel 
      ? openai.responses(this.model) 
      : openai(this.model);
    
    const combinedPrompt = `${system}\n\n${prompt}`;

    const result = await generateText({
      model: modelProvider,
      tools: {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize,
        }),
      },
      prompt: combinedPrompt,
      maxTokens,
    });

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

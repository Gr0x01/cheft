import OpenAI from 'openai';
import { z } from 'zod';
import { extractJsonFromText } from './result-parser';
import { TokenUsage } from './token-tracker';

export type SynthesisTier = 'accuracy' | 'creative';

export interface SynthesisResult<T> {
  data: T | undefined;
  model: string;
  isLocal: boolean;
  usage: TokenUsage;
  success: boolean;
  error?: string;
}

export interface SynthesisConfig {
  accuracyModel?: string;
  creativeModel?: string;
  localUrl?: string;
}

const DEFAULT_CONFIG: Required<SynthesisConfig> = {
  accuracyModel: 'gpt-4o-mini',
  creativeModel: 'qwen3-8b',
  localUrl: '',
};

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5-mini': { input: 0.125, output: 1.0 },
  'gpt-4o-mini': { input: 0.075, output: 0.30 },
  'gpt-4.1-mini': { input: 0.20, output: 0.80 },
  'qwen3-8b': { input: 0, output: 0 },
  'qwen/qwen3-8b': { input: 0, output: 0 },
};

let _openaiClient: OpenAI | null = null;
let _localClient: OpenAI | null = null;
let _localAvailable: boolean | null = null;
let _config: Required<SynthesisConfig> = { ...DEFAULT_CONFIG };

export function configure(config: SynthesisConfig): void {
  _config = { ...DEFAULT_CONFIG, ...config };
  if (config.localUrl) {
    _localClient = null;
    _localAvailable = null;
  }
}

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    _openaiClient = new OpenAI({
      apiKey,
      defaultHeaders: { 'X-Model-Tier': 'flex' },
    });
  }
  return _openaiClient;
}

function getLocalClient(): OpenAI | null {
  const localUrl = _config.localUrl || process.env.LM_STUDIO_URL;
  if (!localUrl) return null;

  if (!_localClient) {
    _localClient = new OpenAI({
      baseURL: `${localUrl}/v1`,
      apiKey: 'not-needed',
    });
  }
  return _localClient;
}

export async function isLocalAvailable(): Promise<boolean> {
  if (_localAvailable !== null) return _localAvailable;

  const localUrl = _config.localUrl || process.env.LM_STUDIO_URL;
  if (!localUrl) {
    _localAvailable = false;
    return false;
  }

  try {
    const response = await fetch(`${localUrl}/v1/models`, {
      signal: AbortSignal.timeout(2000),
    });
    _localAvailable = response.ok;
  } catch {
    _localAvailable = false;
  }

  return _localAvailable;
}

export function resetLocalCheck(): void {
  _localAvailable = null;
  _localClient = null;
}

export function estimateCost(usage: TokenUsage, model: string): number {
  const rates = PRICING[model] || { input: 0, output: 0 };
  return (usage.prompt / 1_000_000) * rates.input + (usage.completion / 1_000_000) * rates.output;
}

function stripQwenThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export async function synthesize<T>(
  tier: SynthesisTier,
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  options: {
    maxTokens?: number;
    temperature?: number;
    retries?: number;
  } = {}
): Promise<SynthesisResult<T>> {
  const maxTokens = options.maxTokens ?? 4000;
  const temperature = options.temperature ?? 0.3;
  const retries = options.retries ?? 2;

  let useLocal = false;
  let model: string;
  let client: OpenAI;

  if (tier === 'accuracy') {
    model = _config.accuracyModel;
    client = getOpenAIClient();
  } else {
    const localAvailable = await isLocalAvailable();
    const localClient = localAvailable ? getLocalClient() : null;
    if (localClient) {
      useLocal = true;
      model = _config.creativeModel;
      client = localClient;
    } else {
      model = _config.accuracyModel;
      client = getOpenAIClient();
    }
  }

  const tierLabel = useLocal ? '🖥️  Local' : '☁️  OpenAI';
  const finalUserPrompt = useLocal ? `/no_think\n${userPrompt}` : userPrompt;

  let lastError: string = '';

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const start = Date.now();

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: finalUserPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const elapsed = Date.now() - start;
      console.log(`      ${tierLabel} (${model}): ${elapsed}ms`);

      let text = response.choices[0]?.message?.content || '';
      
      if (useLocal) {
        text = stripQwenThinking(text);
      }
      
      const usage: TokenUsage = {
        prompt: response.usage?.prompt_tokens || 0,
        completion: response.usage?.completion_tokens || 0,
        total: response.usage?.total_tokens || 0,
      };

      if (!text.trim()) {
        throw new Error('Empty response from LLM');
      }

      const jsonText = extractJsonFromText(text);
      const parsed = JSON.parse(jsonText);
      const validated = schema.parse(parsed);

      return {
        data: validated,
        model,
        isLocal: useLocal,
        usage,
        success: true,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);

      if (attempt < retries) {
        console.log(`      ⚠️  Attempt ${attempt + 1} failed: ${lastError}, retrying...`);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  if (useLocal) {
    console.log(`      ⚠️  Local LLM failed, falling back to OpenAI`);
    return synthesize(tier, systemPrompt, userPrompt, schema, {
      ...options,
      retries: 1,
    });
  }

  return {
    data: undefined,
    model,
    isLocal: useLocal,
    usage: { prompt: 0, completion: 0, total: 0 },
    success: false,
    error: lastError,
  };
}

export async function synthesizeRaw(
  tier: SynthesisTier,
  systemPrompt: string,
  userPrompt: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<{ text: string; model: string; isLocal: boolean; usage: TokenUsage; success: boolean; error?: string }> {
  const maxTokens = options.maxTokens ?? 4000;
  const temperature = options.temperature ?? 0.7;

  let useLocal = false;
  let model: string;
  let client: OpenAI;

  if (tier === 'accuracy') {
    model = _config.accuracyModel;
    client = getOpenAIClient();
  } else {
    const localAvailable = await isLocalAvailable();
    const localClient = localAvailable ? getLocalClient() : null;
    if (localClient) {
      useLocal = true;
      model = _config.creativeModel;
      client = localClient;
    } else {
      model = _config.accuracyModel;
      client = getOpenAIClient();
    }
  }

  const tierLabel = useLocal ? '🖥️  Local' : '☁️  OpenAI';
  const finalUserPrompt = useLocal ? `/no_think\n${userPrompt}` : userPrompt;

  try {
    const start = Date.now();

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalUserPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const elapsed = Date.now() - start;
    console.log(`      ${tierLabel} (${model}): ${elapsed}ms`);

    let text = response.choices[0]?.message?.content || '';
    
    if (useLocal) {
      text = stripQwenThinking(text);
    }
    
    const usage: TokenUsage = {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    return {
      text,
      model,
      isLocal: useLocal,
      usage,
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (useLocal) {
      console.log(`      ⚠️  Local LLM failed, falling back to OpenAI`);
      return synthesizeRaw('accuracy', systemPrompt, userPrompt, options);
    }

    return {
      text: '',
      model,
      isLocal: useLocal,
      usage: { prompt: 0, completion: 0, total: 0 },
      success: false,
      error: errorMsg,
    };
  }
}

export function getActiveTier(tier: SynthesisTier): string {
  if (tier === 'accuracy') {
    return _config.accuracyModel;
  }
  return _localAvailable ? _config.creativeModel : _config.accuracyModel;
}

export function getTierInfo(): {
  accuracyModel: string;
  creativeModel: string;
  localAvailable: boolean | null;
  localUrl: string | undefined;
} {
  return {
    accuracyModel: _config.accuracyModel,
    creativeModel: _config.creativeModel,
    localAvailable: _localAvailable,
    localUrl: _config.localUrl || process.env.LM_STUDIO_URL,
  };
}

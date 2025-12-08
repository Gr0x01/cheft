import OpenAI from 'openai';

export class LocalUnavailableError extends Error {
  constructor() {
    super('Local LLM unavailable - queue job and retry later');
    this.name = 'LocalUnavailableError';
  }
}

export type EnrichmentTier = 'extraction' | 'synthesis';

const TIER_CONFIG = {
  extraction: {
    model: 'gpt-5-mini',
    useLocal: false,
  },
  synthesis: {
    model: 'qwen/qwen3-8b',
    useLocal: true,
  },
};

export interface LocalLLMResponse {
  text: string;
  model: string;
  isLocal: boolean;
  usage: {
    prompt: number;
    completion: number;
    total: number;
  };
}

function getLocalClient(): OpenAI | null {
  const lmStudioUrl = process.env.LM_STUDIO_URL;
  if (!lmStudioUrl) return null;

  return new OpenAI({
    baseURL: `${lmStudioUrl}/v1`,
    apiKey: 'not-needed',
  });
}

function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function isLocalAvailable(): Promise<boolean> {
  const lmStudioUrl = process.env.LM_STUDIO_URL;
  if (!lmStudioUrl) return false;

  try {
    const response = await fetch(`${lmStudioUrl}/v1/models`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function generateWithTier(
  tier: EnrichmentTier,
  prompt: string,
  options: {
    system?: string;
    forceLocal?: boolean;
    forceRemote?: boolean;
  } = {}
): Promise<LocalLLMResponse> {
  const config = TIER_CONFIG[tier];
  let useLocal = config.useLocal;

  if (options.forceLocal) useLocal = true;
  if (options.forceRemote) useLocal = false;

  if (useLocal) {
    const localAvailable = await isLocalAvailable();
    if (!localAvailable) {
      throw new LocalUnavailableError();
    }
  }

  const client = useLocal ? getLocalClient() : getOpenAIClient();
  if (!client) {
    throw new Error('No LLM client available');
  }

  const model = useLocal ? config.model : 'gpt-4o-mini';

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: prompt });

  const start = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages,
  });

  const elapsed = Date.now() - start;
  const tierLabel = useLocal ? '🖥️  Local' : '☁️  OpenAI';
  console.log(`      ${tierLabel} (${model}): ${elapsed}ms`);

  return {
    text: response.choices[0]?.message?.content || '',
    model,
    isLocal: useLocal,
    usage: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
  };
}

export async function extractWithGPT(prompt: string, system?: string): Promise<LocalLLMResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = 'gpt-5-mini';

  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const start = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages,
  });

  const elapsed = Date.now() - start;
  console.log(`      ☁️  OpenAI (${model}): ${elapsed}ms`);

  return {
    text: response.choices[0]?.message?.content || '',
    model,
    isLocal: false,
    usage: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
  };
}

export async function synthesizeWithLocal(prompt: string, system?: string): Promise<LocalLLMResponse> {
  return generateWithTier('synthesis', prompt, { system });
}

export function estimateCost(usage: { prompt: number; completion: number }, model: string): number {
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-5-mini': { input: 0.25, output: 2.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4.1-mini': { input: 0.40, output: 1.6 },
    'qwen/qwen3-8b': { input: 0, output: 0 },
  };

  const rates = pricing[model] || { input: 0, output: 0 };
  return (usage.prompt / 1_000_000) * rates.input + (usage.completion / 1_000_000) * rates.output;
}

export const TIER_COSTS = {
  extraction: 0.006,
  synthesis: 0,
};

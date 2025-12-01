export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('network') || 
        message.includes('timeout') ||
        message.includes('econnreset') ||
        message.includes('econnrefused') ||
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('504')) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  const jitter = Math.random() * 0.3 * delay;
  return Math.min(delay + jitter, options.maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry = opts.retryableErrors 
        ? opts.retryableErrors(error) 
        : isRetryableError(error);

      if (!shouldRetry || attempt === opts.maxAttempts) {
        throw error;
      }

      const delay = calculateDelay(attempt, opts);
      console.warn(
        `[retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${Math.round(delay)}ms:`,
        error instanceof Error ? error.message : String(error)
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function withRetryResult<T>(
  fn: () => Promise<{ success: boolean; error?: string } & T>,
  options: Partial<RetryOptions> = {}
): Promise<{ success: boolean; error?: string } & T> {
  const opts: RetryOptions = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    const result = await fn();

    if (result.success) {
      return result;
    }

    const shouldRetry = result.error && (
      result.error.toLowerCase().includes('network') ||
      result.error.toLowerCase().includes('timeout') ||
      result.error.toLowerCase().includes('rate limit') ||
      result.error.includes('429') ||
      result.error.includes('503')
    );

    if (!shouldRetry || attempt === opts.maxAttempts) {
      return result;
    }

    const delay = calculateDelay(attempt, opts);
    console.warn(
      `[retry] Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${Math.round(delay)}ms:`,
      result.error
    );
    await sleep(delay);
  }

  return fn();
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export async function withRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`   ⚠️ Retry ${attempt}/${MAX_RETRIES} for "${context}" after ${Math.round(delay)}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
}

export async function withCustomRetry<T>(
  fn: () => Promise<T>,
  context: string,
  config: RetryConfig = {}
): Promise<T> {
  const maxRetries = config.maxRetries ?? MAX_RETRIES;
  const baseDelay = config.baseDelayMs ?? BASE_DELAY_MS;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`   ⚠️ Retry ${attempt}/${maxRetries} for "${context}" after ${Math.round(delay)}ms: ${lastError.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

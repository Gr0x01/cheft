import { isLocalAvailable, LocalLLMResponse, LocalUnavailableError } from './local-llm-client';

export { LocalUnavailableError };

export interface QueuedJob<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  forceOpenAI: boolean;
}

const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class LLMQueue {
  private queue: QueuedJob<LocalLLMResponse>[] = [];
  private processing = false;
  private waitingForLocal = false;
  private retryTimeout: NodeJS.Timeout | null = null;

  async enqueue(
    execute: () => Promise<LocalLLMResponse>,
    options: { forceOpenAI?: boolean } = {}
  ): Promise<LocalLLMResponse> {
    return new Promise((resolve, reject) => {
      const job: QueuedJob<LocalLLMResponse> = {
        id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        execute,
        resolve,
        reject,
        forceOpenAI: options.forceOpenAI ?? false,
      };

      this.queue.push(job);
      console.log(`      📥 Queued job ${job.id} (queue size: ${this.queue.length})`);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    const job = this.queue[0];
    if (!job) return;

    if (!job.forceOpenAI) {
      const localAvailable = await isLocalAvailable();
      if (!localAvailable) {
        if (!this.waitingForLocal) {
          this.waitingForLocal = true;
          console.log(`      ⏳ Local LLM unavailable, waiting (${this.queue.length} jobs queued)`);
          this.scheduleRetry();
        }
        return;
      }
    }

    this.waitingForLocal = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    this.processing = true;
    this.queue.shift();

    try {
      console.log(`      ▶️  Processing job ${job.id}`);
      const result = await job.execute();
      job.resolve(result);
    } catch (error) {
      job.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.processing = false;
      this.processNext();
    }
  }

  private scheduleRetry(): void {
    if (this.retryTimeout) return;

    this.retryTimeout = setTimeout(async () => {
      this.retryTimeout = null;
      const available = await isLocalAvailable();
      if (available) {
        console.log(`      ✅ Local LLM available, resuming queue`);
        this.waitingForLocal = false;
        this.processNext();
      } else {
        console.log(`      ⏳ Local still unavailable, waiting...`);
        this.scheduleRetry();
      }
    }, RETRY_INTERVAL_MS);
  }

  getStatus(): { queueLength: number; processing: boolean; waitingForLocal: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      waitingForLocal: this.waitingForLocal,
    };
  }

  clear(): void {
    for (const job of this.queue) {
      job.reject(new Error('Queue cleared'));
    }
    this.queue = [];
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.waitingForLocal = false;
  }

  forceProcessWithOpenAI(): void {
    for (const job of this.queue) {
      job.forceOpenAI = true;
    }
    if (this.waitingForLocal) {
      this.waitingForLocal = false;
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      this.processNext();
    }
  }
}

export const llmQueue = new LLMQueue();

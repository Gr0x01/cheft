export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export class TokenTracker {
  private static instance: TokenTracker;
  private totalUsage: TokenUsage;

  private constructor() {
    this.totalUsage = { prompt: 0, completion: 0, total: 0 };
  }

  static getInstance(): TokenTracker {
    if (!TokenTracker.instance) {
      TokenTracker.instance = new TokenTracker();
    }
    return TokenTracker.instance;
  }

  trackUsage(usage: TokenUsage): void {
    this.totalUsage.prompt += usage.prompt;
    this.totalUsage.completion += usage.completion;
    this.totalUsage.total += usage.total;
  }

  getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  estimateCost(): number {
    const inputCostPer1M = 0.15;
    const outputCostPer1M = 0.60;
    
    const inputCost = (this.totalUsage.prompt / 1_000_000) * inputCostPer1M;
    const outputCost = (this.totalUsage.completion / 1_000_000) * outputCostPer1M;
    
    return inputCost + outputCost;
  }

  reset(): void {
    this.totalUsage = { prompt: 0, completion: 0, total: 0 };
  }
}

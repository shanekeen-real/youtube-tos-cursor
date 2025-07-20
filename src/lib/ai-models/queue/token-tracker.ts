import { TokenUsage } from '../../../types/ai-models';

// Token tracking and rate limiting
export class TokenTracker {
  private minuteTokens = 0;
  private lastReset = Date.now();
  private readonly MINUTE_LIMIT = 250000; // Gemini free tier limit
  private readonly WARNING_THRESHOLD = 0.8; // 80% of limit

  async checkAndWait(): Promise<void> {
    const now = Date.now();
    if (now - this.lastReset > 60000) {
      this.minuteTokens = 0;
      this.lastReset = now;
    }

    if (this.minuteTokens > this.MINUTE_LIMIT * this.WARNING_THRESHOLD) {
      const waitTime = 60000 - (now - this.lastReset);
      console.log(`Token limit approaching (${this.minuteTokens}/${this.MINUTE_LIMIT}), waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.minuteTokens = 0;
      this.lastReset = Date.now();
    }
  }

  recordTokens(count: number): void {
    this.minuteTokens += count;
    console.log(`Tokens used: ${count}, Total this minute: ${this.minuteTokens}/${this.MINUTE_LIMIT}`);
  }

  getCurrentUsage(): TokenUsage {
    return {
      used: this.minuteTokens,
      limit: this.MINUTE_LIMIT,
      remaining: Math.max(0, this.MINUTE_LIMIT - this.minuteTokens)
    };
  }
} 
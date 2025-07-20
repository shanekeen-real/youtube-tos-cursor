import { QueueRequest, TokenUsage } from '../../../types/ai-models';
import { TokenTracker } from './token-tracker';

// Request queuing system
export class AIRequestQueue {
  private queue: Array<QueueRequest<unknown>> = [];
  private processing = false;
  private tokenTracker = new TokenTracker();

  async addRequest<T>(request: () => Promise<T>, estimatedTokens: number = 1000): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await this.tokenTracker.checkAndWait();
          const result = await request();
          this.tokenTracker.recordTokens(estimatedTokens);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        await request();
        // Add delay between requests to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    this.processing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getCurrentUsage() {
    return this.tokenTracker.getCurrentUsage();
  }
} 
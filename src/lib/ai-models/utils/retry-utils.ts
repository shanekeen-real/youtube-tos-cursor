import { AIError } from '../../../types/ai-models';
import type { AIModel } from '../interfaces';
import { getAIModel } from './model-factory';

export async function callAIWithRetry<T>(aiCall: (model: AIModel) => Promise<T>, maxRetries: number = 3): Promise<T> {
  const model = getAIModel();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await aiCall(model);
    } catch (error: unknown) {
      const aiError = error as AIError;
      if (aiError.status === 429 || (aiError.message && aiError.message.includes('429'))) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 30000); // Cap delay at 30 seconds
        console.log(`Quota limit hit on attempt ${attempt + 1}, retrying in ${delay/1000}s...`);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      if (aiError.status === 503 || (aiError.message && aiError.message.includes('503')) || 
          (aiError.message && aiError.message.includes('overloaded'))) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 30000); // Cap delay at 30 seconds
        console.log(`Model overloaded on attempt ${attempt + 1}, retrying in ${delay/1000}s...`);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded for AI API call');
} 
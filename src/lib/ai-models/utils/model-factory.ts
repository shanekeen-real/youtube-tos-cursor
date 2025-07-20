import type { AIModel } from '../interfaces';
import { SmartAIModel } from '../models/smart-ai-model';
import { ClaudeModel } from '../models/claude-model';

export function getAIModel(): AIModel {
  if (process.env.GOOGLE_API_KEY) {
    try {
      return new SmartAIModel();
    } catch (error) {
      console.warn('Smart AI model initialization failed, falling back to basic model:', error);
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return new ClaudeModel();
  }
  throw new Error('No AI API keys available. Please set either GOOGLE_API_KEY or ANTHROPIC_API_KEY in your environment variables.');
}

export function getModelWithFallback(): AIModel {
  return getAIModel();
} 
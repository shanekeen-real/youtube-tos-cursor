import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { usageTracker } from './usage-tracker';

// Model abstraction layer for seamless switching between Gemini and Claude
export interface AIModel {
  generateContent: (prompt: string) => Promise<string>;
  name: string;
}

export class GeminiModel implements AIModel {
  name = 'gemini-1.5-flash-latest';
  private model: any;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
  }

  async generateContent(prompt: string): Promise<string> {
    usageTracker.recordCall('gemini');
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}

export class ClaudeModel implements AIModel {
  name = 'claude-3-5-sonnet-20241022';
  private anthropic: any;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY as string,
    });
  }

  async generateContent(prompt: string): Promise<string> {
    usageTracker.recordCall('claude');
    const message = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });
    // Join all text blocks from the response
    return message.content
      .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text)
      .join('');
  }
}

export function getAIModel(): AIModel {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return new ClaudeModel();
    } catch (error) {
      console.warn('Claude model initialization failed, falling back to Gemini:', error);
    }
  }
  if (process.env.GOOGLE_API_KEY) {
    return new GeminiModel();
  }
  throw new Error('No AI API keys available. Please set either ANTHROPIC_API_KEY or GOOGLE_API_KEY in your environment variables.');
}

export class RateLimiter {
  private requests: number[] = [];
  private maxRequests = 80;
  private windowMs = 60000;

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.requests.push(now);
  }
}

export async function callAIWithRetry<T>(aiCall: (model: AIModel) => Promise<T>, maxRetries: number = 3): Promise<T> {
  const model = getAIModel();
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await aiCall(model);
    } catch (error: any) {
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.log(`Quota limit hit on attempt ${attempt + 1}, retrying in ${Math.pow(2, attempt)}s...`);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded for AI API call');
}

export function getModelWithFallback(): AIModel {
  return getAIModel();
} 
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { usageTracker } from './usage-tracker';

// Model abstraction layer for seamless switching between Gemini and Claude
export interface AIModel {
  generateContent: (prompt: string) => Promise<string>;
  generateMultiModalContent?: (prompt: string, videoUrl: string, transcript?: string, metadata?: any) => Promise<string>;
  name: string;
  supportsMultiModal: boolean;
}

// Token tracking and rate limiting
class TokenTracker {
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

  getCurrentUsage(): { used: number; limit: number; remaining: number } {
    return {
      used: this.minuteTokens,
      limit: this.MINUTE_LIMIT,
      remaining: Math.max(0, this.MINUTE_LIMIT - this.minuteTokens)
    };
  }
}

// Request queuing system
class AIRequestQueue {
  private queue: Array<() => Promise<any>> = [];
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

export class GeminiModel implements AIModel {
  name = 'gemini-2.5-flash-preview-04-17';
  supportsMultiModal = true;
  private model: any;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-preview-04-17',
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        topP: 0.8,
        topK: 40,
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

  async generateMultiModalContent(prompt: string, videoPath: string, transcript?: string, metadata?: any): Promise<string> {
    usageTracker.recordCall('gemini');
    
    try {
      // Read video file and convert to base64
      const fs = await import('fs');
      const videoBuffer = fs.readFileSync(videoPath);
      const videoBase64 = videoBuffer.toString('base64');
      
      // Create multi-modal content parts
      const parts: any[] = [
        { text: prompt }
      ];

      // Add video content as base64
      parts.push({
        inlineData: {
          mimeType: 'video/mp4',
          data: videoBase64
        }
      });

      // Add transcript if available
      if (transcript) {
        parts.push({ text: `\n\nTranscript:\n${transcript}` });
      }

      // Add metadata if available
      if (metadata) {
        parts.push({ text: `\n\nVideo Metadata:\nTitle: ${metadata.title}\nDescription: ${metadata.description}` });
      }

      const result = await this.model.generateContent(parts);
      return result.response.text();
    } catch (error: any) {
      console.error('Multi-modal analysis failed, falling back to text-only:', error);
      // Fallback to text-only analysis
      const fallbackPrompt = `${prompt}\n\n${transcript ? `Transcript: ${transcript}` : ''}\n\n${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}`;
      return this.generateContent(fallbackPrompt);
    }
  }
}

export class ClaudeModel implements AIModel {
  name = 'claude-3-5-sonnet-20241022';
  supportsMultiModal = false;
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

// Smart AI model that always uses Gemini for video analysis but can fallback to Claude for text
export class SmartAIModel implements AIModel {
  name = 'smart-model';
  supportsMultiModal = true;
  private geminiModel: GeminiModel;
  private claudeModel: ClaudeModel;
  private queue: AIRequestQueue;

  constructor() {
    this.geminiModel = new GeminiModel();
    this.claudeModel = new ClaudeModel();
    this.queue = new AIRequestQueue();
  }

  async generateContent(prompt: string): Promise<string> {
    // For text-only content, try Gemini first, fallback to Claude if quota exceeded
    try {
      return await this.queue.addRequest(
        () => this.geminiModel.generateContent(prompt),
        this.estimateTokens(prompt)
      );
    } catch (error: any) {
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.log('Gemini quota exceeded for text analysis, switching to Claude');
        return await this.claudeModel.generateContent(prompt);
      }
      throw error;
    }
  }

  async generateMultiModalContent(prompt: string, videoPath: string, transcript?: string, metadata?: any): Promise<string> {
    // ALWAYS use Gemini for multi-modal content (video analysis)
    // This is crucial for accuracy as Claude cannot see video content
    try {
      return await this.queue.addRequest(
        () => this.geminiModel.generateMultiModalContent(prompt, videoPath, transcript, metadata),
        this.estimateTokens(prompt) + (transcript ? this.estimateTokens(transcript) : 0) + 5000 // Extra tokens for video processing
      );
    } catch (error: any) {
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.log('Gemini quota exceeded for video analysis, falling back to text-only with Claude');
        // Fallback to text-only analysis with Claude using available context
        const fallbackPrompt = `${prompt}\n\n${transcript ? `Transcript: ${transcript}` : ''}\n\n${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}`;
        return await this.claudeModel.generateContent(fallbackPrompt);
      }
      throw error;
    }
  }

  // Method to get video context from Gemini, then use Claude for subsequent analysis
  async getVideoContextWithGemini(videoPath: string, transcript?: string, metadata?: any): Promise<string> {
    const contextPrompt = `
      Analyze this video content and provide a comprehensive context summary including:
      - Visual content description
      - Content type and style
      - Key visual elements
      - Overall tone and presentation
      - Any notable visual features or concerns
      
      Provide this as a detailed text summary that can be used for further analysis.
    `;

    return await this.generateMultiModalContent(contextPrompt, videoPath, transcript, metadata);
  }

  // Method to perform text-based analysis with Claude using video context
  async performTextAnalysisWithContext(
    analysisPrompt: string, 
    videoContext: string, 
    transcript?: string, 
    metadata?: any
  ): Promise<string> {
    const enhancedPrompt = `
      ${analysisPrompt}
      
      VIDEO CONTEXT (from visual analysis):
      ${videoContext}
      
      ${transcript ? `TRANSCRIPT:\n${transcript}` : ''}
      
      ${metadata ? `METADATA:\n${JSON.stringify(metadata)}` : ''}
      
      Use the video context above to provide accurate analysis.
    `;

    return await this.claudeModel.generateContent(enhancedPrompt);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.getQueueLength(),
      usage: this.queue.getCurrentUsage()
    };
  }
}

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
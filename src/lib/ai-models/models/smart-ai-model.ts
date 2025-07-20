import { usageTracker } from '../../usage-tracker';
import { VideoMetadata } from '../../../types/user';
import { GeminiError, QueueStatus } from '../../../types/ai-models';
import type { AIModel } from '../interfaces';
import { GeminiModel } from './gemini-model';
import { Gemini15ProModel } from './gemini15pro-model';
import { ClaudeModel } from './claude-model';
import { AIRequestQueue } from '../queue/ai-request-queue';

// Smart AI model that always uses Gemini for video analysis but can fallback to Claude for text
export class SmartAIModel implements AIModel {
  name = 'smart-model';
  supportsMultiModal = true;
  private geminiModel: GeminiModel;
  private gemini15ProModel: Gemini15ProModel;
  private claudeModel: ClaudeModel;
  private queue: AIRequestQueue;

  constructor() {
    this.geminiModel = new GeminiModel();
    this.gemini15ProModel = new Gemini15ProModel();
    this.claudeModel = new ClaudeModel();
    this.queue = new AIRequestQueue();
  }

  async generateContent(prompt: string): Promise<string> {
    // For text-only content, try Gemini 2.0 Flash, then Gemini 1.5 Pro, then Claude
    try {
      return await this.queue.addRequest(
        () => this.geminiModel.generateContent(prompt),
        this.estimateTokens(prompt)
      );
    } catch (error: unknown) {
      const aiError = error as GeminiError;
      if (aiError.status === 429 || (aiError.message && aiError.message.includes('429')) ||
          aiError.status === 503 || (aiError.message && aiError.message.includes('503')) ||
          (aiError.message && aiError.message.includes('overloaded'))) {
        console.log('Gemini 2.0 Flash unavailable, trying Gemini 1.5 Pro for text analysis');
        try {
          return await this.queue.addRequest(
            () => this.gemini15ProModel.generateContent(prompt),
            this.estimateTokens(prompt)
          );
        } catch (error2: unknown) {
          const aiError2 = error2 as GeminiError;
          if (aiError2.status === 429 || (aiError2.message && aiError2.message.includes('429')) ||
              aiError2.status === 503 || (aiError2.message && aiError2.message.includes('503')) ||
              (aiError2.message && aiError2.message.includes('overloaded'))) {
            console.log('Gemini 1.5 Pro unavailable, switching to Claude');
            return await this.claudeModel.generateContent(prompt);
          }
          throw error2;
        }
      }
      throw error;
    }
  }

  async generateMultiModalContent(prompt: string, videoPath: string, transcript?: string, metadata?: VideoMetadata): Promise<string> {
    // Try Gemini 2.0 Flash, then Gemini 1.5 Pro, then fallback to text-only with Claude
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.queue.addRequest(
          () => this.geminiModel.generateMultiModalContent(prompt, videoPath, transcript, metadata),
          this.estimateTokens(prompt) + (transcript ? this.estimateTokens(transcript) : 0) + 5000
        );
      } catch (error: unknown) {
        const aiError = error as GeminiError;
        if (aiError.status === 429 || (aiError.message && aiError.message.includes('429')) ||
            aiError.status === 503 || (aiError.message && aiError.message.includes('503')) ||
            (aiError.message && aiError.message.includes('overloaded'))) {
          console.log('Gemini 2.0 Flash unavailable, trying Gemini 1.5 Pro for multi-modal analysis');
          try {
            return await this.queue.addRequest(
              () => this.gemini15ProModel.generateMultiModalContent(prompt, videoPath, transcript, metadata),
              this.estimateTokens(prompt) + (transcript ? this.estimateTokens(transcript) : 0) + 5000
            );
          } catch (error2: unknown) {
            const aiError2 = error2 as GeminiError;
            if (aiError2.status === 429 || (aiError2.message && aiError2.message.includes('429')) ||
                aiError2.status === 503 || (aiError2.message && aiError2.message.includes('503')) ||
                (aiError2.message && aiError2.message.includes('overloaded'))) {
              console.log('Gemini 1.5 Pro unavailable, falling back to text-only with Claude');
              const fallbackPrompt = `${prompt}\n\n${transcript ? `Transcript: ${transcript}` : ''}\n\n${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}`;
              return await this.claudeModel.generateContent(fallbackPrompt);
            }
            throw error2;
          }
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded for multi-modal API call');
  }

  // Method to get video context from Gemini, then use Claude for subsequent analysis
  async getVideoContextWithGemini(videoPath: string, transcript?: string, metadata?: VideoMetadata): Promise<string> {
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
    metadata?: VideoMetadata
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

  getQueueStatus(): QueueStatus {
    return {
      queueLength: this.queue.getQueueLength(),
      usage: this.queue.getCurrentUsage()
    };
  }
} 
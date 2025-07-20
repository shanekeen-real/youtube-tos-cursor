import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { usageTracker } from '../../usage-tracker';
import { VideoMetadata } from '../../../types/user';
import { 
  GeminiError, 
  ContentPart, 
  GeminiModelInstance 
} from '../../../types/ai-models';
import type { AIModel } from '../interfaces';

export class Gemini15ProModel implements AIModel {
  name = 'gemini-1.5-pro';
  supportsMultiModal = true;
  private model: GeminiModelInstance;

  constructor() {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
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
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        return result.response.text();
      } catch (error: unknown) {
        const aiError = error as GeminiError;
        if (aiError.status === 503 || (aiError.message && aiError.message.includes('503')) || 
            (aiError.message && aiError.message.includes('overloaded'))) {
          console.log(`Gemini 1.5 Pro model overloaded on attempt ${attempt + 1}, retrying in ${Math.pow(2, attempt)}s...`);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded for Gemini 1.5 Pro API call');
  }

  async generateMultiModalContent(prompt: string, videoPath: string, transcript?: string, metadata?: VideoMetadata): Promise<string> {
    usageTracker.recordCall('gemini');
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const fs = await import('fs');
        const videoBuffer = fs.readFileSync(videoPath);
        const videoBase64 = videoBuffer.toString('base64');
        const parts: ContentPart[] = [ { text: prompt } ];
        parts.push({
          inlineData: {
            mimeType: 'video/mp4',
            data: videoBase64
          }
        });
        if (transcript) {
          parts.push({ text: `\n\nTranscript:\n${transcript}` });
        }
        if (metadata) {
          parts.push({ text: `\n\nVideo Metadata:\nTitle: ${metadata.title}\nDescription: ${metadata.description}` });
        }
        const result = await this.model.generateContent(parts);
        return result.response.text();
      } catch (error: unknown) {
        const aiError = error as GeminiError;
        if (aiError.status === 503 || (aiError.message && aiError.message.includes('503')) || 
            (aiError.message && aiError.message.includes('overloaded'))) {
          console.log(`Gemini 1.5 Pro model overloaded on attempt ${attempt + 1}, retrying in ${Math.pow(2, attempt)}s...`);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            continue;
          }
        }
        // For other errors, fallback to text-only analysis
        console.error('Gemini 1.5 Pro multi-modal analysis failed, falling back to text-only:', error);
        const fallbackPrompt = `${prompt}\n\n${transcript ? `Transcript: ${transcript}` : ''}\n\n${metadata ? `Metadata: ${JSON.stringify(metadata)}` : ''}`;
        return this.generateContent(fallbackPrompt);
      }
    }
    throw new Error('Max retries exceeded for Gemini 1.5 Pro multi-modal API call');
  }
} 
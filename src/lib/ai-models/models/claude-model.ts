import Anthropic from '@anthropic-ai/sdk';
import { usageTracker } from '../../usage-tracker';
import { AnthropicInstance } from '../../../types/ai-models';
import type { AIModel } from '../interfaces';

export class ClaudeModel implements AIModel {
  name = 'claude-3-5-sonnet-20241022';
  supportsMultiModal = false;
  private anthropic: AnthropicInstance;

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
      .filter((c) => c.type === 'text' && typeof c.text === 'string')
      .map((c) => c.text!)
      .join('');
  }
} 
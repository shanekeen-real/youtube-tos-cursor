// AI Model Error Types

// AI Model Error Types
export interface AIError extends Error {
  status?: number;
  code?: string;
  message: string;
}

export interface GeminiError extends AIError {
  status: 429 | 503 | 500;
}

export interface ClaudeError extends AIError {
  status: 429 | 500;
}

// Multi-modal Content Parts
export interface TextContentPart {
  text: string;
}

export interface VideoContentPart {
  inlineData: {
    mimeType: 'video/mp4';
    data: string; // base64 encoded video
  };
}

export type ContentPart = TextContentPart | VideoContentPart;

// AI Model Instance Types
export interface GeminiModelInstance {
  generateContent: (prompt: string | ContentPart[]) => Promise<{
    response: {
      text: () => string;
    };
  }>;
}

export interface AnthropicInstance {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      temperature: number;
      messages: Array<{ role: 'user'; content: string }>;
    }) => Promise<{
      content: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };
}

// Queue and Request Types
export interface QueueRequest<T> {
  (): Promise<T>;
}

export interface TokenUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface QueueStatus {
  queueLength: number;
  usage: TokenUsage;
} 
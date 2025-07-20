import { VideoMetadata } from '../../types/user';

// Model abstraction layer for seamless switching between Gemini and Claude
export interface AIModel {
  generateContent: (prompt: string) => Promise<string>;
  generateMultiModalContent?: (prompt: string, videoUrl: string, transcript?: string, metadata?: VideoMetadata) => Promise<string>;
  name: string;
  supportsMultiModal: boolean;
} 
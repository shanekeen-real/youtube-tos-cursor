export interface VideoProcessingResult {
  videoPath: string;
  thumbnailPath?: string;
  duration: number;
  resolution: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

// FFprobe output types for video analysis
export interface FFprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  pix_fmt?: string;
  duration?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  [key: string]: unknown; // Allow for additional FFprobe properties
}

export interface FFprobeFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
  [key: string]: unknown; // Allow for additional FFprobe properties
}

export interface FFprobeOutput {
  streams?: FFprobeStream[];
  format?: FFprobeFormat;
  [key: string]: unknown; // Allow for additional FFprobe properties
}

import { VideoMetadata } from './user';

export interface VideoAnalysisData {
  videoPath: string;
  transcript?: string;
  metadata?: VideoMetadata;
  videoInfo?: VideoProcessingResult;
} 
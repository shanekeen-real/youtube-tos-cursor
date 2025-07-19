export interface VideoProcessingResult {
  videoPath: string;
  thumbnailPath?: string;
  duration: number;
  resolution: string;
  fileSize: number;
  success: boolean;
  error?: string;
}

export interface VideoAnalysisData {
  videoPath: string;
  transcript?: string;
  metadata?: any;
  videoInfo?: VideoProcessingResult;
} 
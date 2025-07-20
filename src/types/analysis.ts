import { PolicyCategoryAnalysis, ContextAnalysis, RiskAssessment, ConfidenceAnalysis, Suggestion, RiskLevel, AnalysisMode, QueueStatusType } from './ai-analysis';

// Analysis result types
export interface AnalysisResult {
  success: boolean;
  data?: EnhancedAnalysisResult;
  error?: string;
  processingTime?: number;
}

export interface EnhancedAnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  confidence_score: number;
  flagged_section: string;
  policy_categories: {
    [category: string]: PolicyCategoryAnalysis;
  };
  context_analysis: ContextAnalysis;
  highlights: AnalysisHighlight[];
  suggestions: Suggestion[];
  risky_spans?: RiskSpan[];
  risky_phrases?: string[];
  risky_phrases_by_category?: { [category: string]: string[] };
  ai_detection?: AIDetectionResult | null;
  analysis_metadata: AnalysisMetadata;
}

export interface AnalysisHighlight {
  category: string;
  risk: string;
  score: number;
  confidence: number;
}

export interface RiskSpan {
  text: string;
  start_index?: number;
  end_index?: number;
  risk_level: RiskLevel;
  policy_category: string;
  explanation: string;
}

export interface AIDetectionResult {
  probability: number;
  confidence: number;
  patterns: string[];
  indicators: {
    repetitive_language: number;
    structured_content: number;
    personal_voice: number;
    grammar_consistency: number;
    natural_flow: number;
  };
  explanation: string;
}

export interface AnalysisMetadata {
  model_used: string;
  analysis_timestamp: string;
  processing_time_ms: number;
  content_length: number;
  analysis_mode: AnalysisMode;
  queue_status?: QueueStatus;
}

export interface QueueStatus {
  position?: number | null;
  total?: number | null;
  estimated_wait?: number | null;
  status: QueueStatusType;
}

// Batch analysis types
export interface BatchAnalysisResult {
  categories: {
    [category: string]: PolicyCategoryAnalysis;
  };
}

// Multi-modal analysis types
export interface MultiModalAnalysisResult extends EnhancedAnalysisResult {
  video_analysis?: VideoAnalysisData;
  audio_analysis?: AudioAnalysisData;
  visual_analysis?: VisualAnalysisData;
}

export interface VideoAnalysisData {
  duration: number;
  resolution: string;
  frameRate?: number;
  codec?: string;
  fileSize: number;
}

export interface AudioAnalysisData {
  duration: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
}

export interface VisualAnalysisData {
  thumbnailPath?: string;
  frameAnalysis?: FrameAnalysis[];
}

export interface FrameAnalysis {
  timestamp: number;
  content: string;
  confidence: number;
}

// JSON parsing result types
export interface JSONParsingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  strategy?: string;
  fallbackData?: T;
}

// Schema validation types
export interface SchemaValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  data?: unknown;
}

// Error handling types
export interface AnalysisError {
  type: 'validation' | 'processing' | 'api' | 'timeout' | 'unknown';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  retryable?: boolean;
}

// Processing configuration types
export interface ProcessingConfig {
  chunkSize: number;
  overlap: number;
  maxRetries: number;
  timeout: number;
  rateLimit: {
    requests: number;
    window: number;
  };
}

// Model response types
export interface ModelResponse {
  content: string;
  model: string;
  timestamp: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  metadata?: Record<string, unknown>;
}

// Content processing types
export interface ContentChunk {
  text: string;
  start: number;
  end: number;
  index: number;
}

export interface ProcessedContent {
  original: string;
  decoded: string;
  chunks: ContentChunk[];
  language: string;
  length: number;
  needsChunking: boolean;
} 

// YouTube Transcript Types
export interface YouTubeTranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

// Page Structure Analysis Types
export interface FormAnalysis {
  action: string;
  method: string;
  html: string;
}

export interface InputAnalysis {
  name: string;
  type: string;
  value: string;
}

export interface PageStructureAnalysis {
  forms: FormAnalysis[];
  inputs: InputAnalysis[];
  buttons: string[];
  potentialEndpoints: string[];
  hasJavaScript: boolean;
  hasReact: boolean;
  hasVue: boolean;
}

// Analysis Result Normalization Type
export interface NormalizedAnalysisResult {
  riskLevel: string;
  riskScore: number;
  title: string;
  flaggedSections: string[];
  suggestions: unknown[];
  [key: string]: unknown; // Allow for additional properties from AI analysis
} 
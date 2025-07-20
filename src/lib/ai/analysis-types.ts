import { 
  PolicyCategoryAnalysis, 
  ContextAnalysis, 
  EnhancedAnalysisResult, 
  RiskSpan, 
  RiskAssessment, 
  ConfidenceAnalysis, 
  Suggestion,
  RiskLevel,
  PriorityLevel,
  SeverityLevel,
  AnalysisMode
} from '../../types/ai-analysis';
import { ChannelContext } from '../../types/user';

// Type for basic analysis result
export interface BasicAnalysisResult {
  risk_score: number;
  risk_level: RiskLevel;
  flagged_section: string;
  highlights: Array<{
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }>;
  suggestions: Array<{
    title: string;
    text: string;
    priority: PriorityLevel;
    impact_score: number;
  }>;
}

// Analysis options interface
export interface AnalysisOptions {
  enableChunking?: boolean;
  chunkSize?: number;
  overlap?: number;
  maxSuggestions?: number;
  enableAIDetection?: boolean;
}

// Analysis context interface
export interface AnalysisContext {
  text: string;
  decodedText: string;
  detectedLanguage: string;
  isNonEnglish: boolean;
  needsChunking: boolean;
  chunkSize: number;
  overlap: number;
}

// Analysis result interface for internal processing
export interface AnalysisProcessingResult {
  contextAnalysis: ContextAnalysis;
  policyAnalysis: { [category: string]: PolicyCategoryAnalysis };
  riskAssessment?: RiskAssessment;
  confidenceAnalysis: ConfidenceAnalysis;
  suggestions: Suggestion[];
  allRiskySpans: RiskSpan[];
  allRiskyPhrases: string[];
  aiDetectionResult?: {
    probability: number;
    confidence: number;
    patterns: string[];
    indicators: string[];
    explanation: string;
  } | null;
}

// Emergency fallback result interface
export interface EmergencyFallbackResult {
  risk_score: number;
  risk_level: RiskLevel;
  confidence_score: number;
  flagged_section: string;
  policy_categories: Record<string, never>;
  context_analysis: {
    content_type: string;
    target_audience: string;
    monetization_impact: number;
    content_length: number;
    language_detected: string;
  };
  highlights: Array<{
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }>;
  suggestions: Array<{
    title: string;
    text: string;
    priority: PriorityLevel;
    impact_score: number;
  }>;
  risky_spans: RiskSpan[];
  risky_phrases: string[];
  risky_phrases_by_category: Record<string, never>;
  analysis_metadata: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: AnalysisMode;
  };
} 
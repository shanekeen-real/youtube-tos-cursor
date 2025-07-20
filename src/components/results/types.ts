import { Suggestion, SeverityLevel, RiskLevel } from '../../types/ai-analysis';

export interface RiskSpan {
  text: string;
  start_index: number;
  end_index: number;
  risk_level: RiskLevel;
  policy_category: string;
  explanation: string;
}

export interface ScanData {
  id?: string;
  url?: string;
  title?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  flaggedSections: string[];
  suggestions: Suggestion[];
  createdAt?: string;
  userId?: string;
  // Enhanced fields
  context_analysis?: {
    content_type: string;
    target_audience: string;
    monetization_impact: number;
    content_length: number;
    language_detected: string;
  };
  policy_categories?: {
    [category: string]: {
      risk_score: number;
      confidence: number;
      violations: string[];
      severity: SeverityLevel;
      explanation: string;
    };
  };
  highlights?: {
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }[];
  risky_spans?: RiskSpan[];
  analysis_metadata?: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: string;
  };
  analyzed_content?: string;
  analysis_source?: string;
  allSuggestionsCount?: number;
  risky_phrases?: string[];
  risky_phrases_by_category?: { [category: string]: string[] };
  ai_detection?: {
    probability: number;
    confidence: number;
    patterns: string[];
    indicators: {
      personal_voice: number;
      natural_flow: number;
      grammar_consistency: number;
      structured_content: number;
    };
    explanation: string;
  };
}

export type TabType = 'overview' | 'details' | 'suggestions' | 'ai-detection';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAccess?: boolean;
} 
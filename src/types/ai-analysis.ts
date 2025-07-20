import { z } from 'zod';
import { ANALYSIS_MODES, QUEUE_STATUS } from '../lib/constants/analysis-config';

// Use the constants for queue status types
export type QueueStatusType = typeof QUEUE_STATUS[keyof typeof QUEUE_STATUS];

// Queue status interface for analysis metadata
export interface QueueStatus {
  position?: number | null;
  total?: number | null;
  estimated_wait?: number | null;
  status: QueueStatusType;
}

// Type aliases for reusability and consistency
export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// Use the constants for analysis mode types
export type AnalysisMode = typeof ANALYSIS_MODES[keyof typeof ANALYSIS_MODES];

// YouTube Policy Categories
export const YOUTUBE_POLICY_CATEGORIES = {
  CONTENT_SAFETY: {
    VIOLENCE: 'Violence & Graphic Content',
    DANGEROUS_ACTS: 'Dangerous Acts & Challenges',
    HARMFUL_CONTENT: 'Harmful or Dangerous Content',
    CHILD_SAFETY: 'Child Safety',
  },
  COMMUNITY_STANDARDS: {
    HARASSMENT: 'Harassment & Cyberbullying',
    HATE_SPEECH: 'Hate Speech',
    SPAM: 'Spam, Deceptive Practices & Scams',
    MISINFORMATION: 'Misinformation',
  },
  ADVERTISER_FRIENDLY: {
    SEXUAL_CONTENT: 'Sexual Content',
    PROFANITY: 'Profanity & Inappropriate Language',
    CONTROVERSIAL: 'Controversial or Sensitive Topics',
    BRAND_SAFETY: 'Brand Safety Issues',
  },
  LEGAL_COMPLIANCE: {
    COPYRIGHT: 'Copyright & Intellectual Property',
    PRIVACY: 'Privacy & Personal Information',
    TRADEMARK: 'Trademark Violations',
    LEGAL_REQUESTS: 'Legal Requests & Compliance',
  },
  MONETIZATION: {
    AD_POLICIES: 'Ad-Friendly Content Guidelines',
    SPONSORED_CONTENT: 'Sponsored Content Disclosure',
    MONETIZATION_ELIGIBILITY: 'Monetization Eligibility',
  }
} as const;

// Enhanced analysis result structure
export interface PolicyCategoryAnalysis {
  risk_score: number;
  confidence: number;
  violations: string[];
  severity: SeverityLevel;
  explanation: string;
}

export interface ContextAnalysis {
  content_type: string;
  target_audience: string;
  monetization_impact: number;
  content_length: number;
  language_detected: string;
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
  highlights: {
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }[];
  suggestions: {
    title: string;
    text: string;
    priority: PriorityLevel;
    impact_score: number;
  }[];
  risky_spans?: RiskSpan[];
  risky_phrases?: string[]; // Added for frontend highlighting
  risky_phrases_by_category?: { [category: string]: string[] }; // Added for categorized highlighting
  ai_detection?: {
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
  } | null;
  analysis_metadata: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: AnalysisMode;
    queue_status?: QueueStatus; // Optional queue status for monitoring
  };
}

export interface BatchAnalysisResult {
  categories: {
    [category: string]: PolicyCategoryAnalysis;
  };
}

export interface ContentClassification {
  content_type: string;
  primary_themes: string[];
  target_audience: string;
  content_quality: string;
  engagement_level: string;
}

export interface RiskSpan {
  text: string;
  start_index?: number;
  end_index?: number;
  risk_level: RiskLevel;
  policy_category: string;
  explanation: string;
}

export interface RiskAssessment {
  overall_risk_score: number;
  flagged_section: string;
  risk_factors: string[];
  severity_level: SeverityLevel;
  risky_phrases_by_category?: {
    [category: string]: string[]; // List of risky words/phrases for this category
  };
  risky_spans?: RiskSpan[]; // Optionally, for context
}

export interface ConfidenceAnalysis {
  overall_confidence: number;
  text_clarity: number;
  policy_specificity: number;
  context_availability: number;
  confidence_factors: string[];
}

export interface Suggestion {
  title: string;
  text: string;
  priority: PriorityLevel;
  impact_score: number;
}

// Zod schemas for validation
export const PolicyCategoryAnalysisSchema = z.object({
  risk_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  violations: z.array(z.string()),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH'] as const),
  explanation: z.string()
});

export const BatchAnalysisSchema = z.object({
  categories: z.record(z.string(), PolicyCategoryAnalysisSchema)
});

export const ContextAnalysisSchema = z.object({
  content_type: z.string(),
  target_audience: z.string(),
  monetization_impact: z.number().min(0).max(100),
  content_length: z.number(),
  language_detected: z.string()
});

export const RiskSpanSchema = z.object({
  text: z.string(),
  start_index: z.number().min(0).optional(),
  end_index: z.number().min(0).optional(),
  risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH'] as const),
  policy_category: z.string(),
  explanation: z.string()
});

export const RiskAssessmentSchema = z.object({
  overall_risk_score: z.number().min(0).max(100),
  flagged_section: z.string(),
  risk_factors: z.array(z.string()),
  severity_level: z.enum(['LOW', 'MEDIUM', 'HIGH'] as const),
  risky_spans: z.array(RiskSpanSchema).optional(),
  risky_phrases_by_category: z.record(z.string(), z.array(z.string())).optional()
});

export const ConfidenceAnalysisSchema = z.object({
  overall_confidence: z.number().min(0).max(100),
  text_clarity: z.number().min(0).max(100),
  policy_specificity: z.number().min(0).max(100),
  context_availability: z.number().min(0).max(100),
  confidence_factors: z.array(z.string())
});

export const SuggestionSchema = z.object({
  title: z.string(),
  text: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW'] as const),
  impact_score: z.number().min(0).max(100)
});

export const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionSchema)
});

export const ContentClassificationSchema = z.object({
  content_type: z.string(),
  primary_themes: z.array(z.string()),
  target_audience: z.string(),
  content_quality: z.string(),
  engagement_level: z.string(),
}); 
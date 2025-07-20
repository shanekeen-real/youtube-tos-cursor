import { ContextAnalysis } from '@/types/ai-analysis';

export interface HighlightedTranscriptProps {
  content: string;
  riskyPhrases?: string[];
  riskyPhrasesByCategory?: { [category: string]: string[] };
  policyCategories?: { [category: string]: { explanation: string; risk_score?: number } };
  contextAnalysis?: ContextAnalysis;
  className?: string;
}

export interface TranscriptParagraphProps {
  paragraph: string;
  riskyPhrases: string[];
  contextAnalysis?: ContextAnalysis;
}

export interface HighlightedPhraseProps {
  phrase: string;
  contextAnalysis?: ContextAnalysis;
} 
export interface HighlightedTranscriptProps {
  content: string;
  riskyPhrases?: string[];
  riskyPhrasesByCategory?: { [category: string]: string[] };
  policyCategories?: { [category: string]: { explanation: string; risk_score?: number } };
  contextAnalysis?: {
    content_type?: string;
    target_audience?: string;
  };
  className?: string;
}

export interface TranscriptParagraphProps {
  paragraph: string;
  riskyPhrases: string[];
  contextAnalysis?: {
    content_type?: string;
    target_audience?: string;
  };
}

export interface HighlightedPhraseProps {
  phrase: string;
  contextAnalysis?: {
    content_type?: string;
    target_audience?: string;
  };
} 
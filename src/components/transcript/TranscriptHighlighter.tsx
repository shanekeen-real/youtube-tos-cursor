import React, { useMemo } from 'react';
import { filterFalsePositives } from '@/lib/false-positive-filter';
import { 
  getPhraseCategoryAndExplanation, 
  processRiskyPhrases, 
  scanParagraphForTerms, 
  processTextInChunks,
  getHighlightingStyles 
} from '@/lib/transcript/highlighting-utils';
import { TranscriptParagraphProps } from './types';

function TranscriptHighlighter({ 
  paragraph, 
  riskyPhrases, 
  contextAnalysis 
}: TranscriptParagraphProps) {
  // Performance optimization: Memoize phrase processing
  const processedPhrases = useMemo(() => {
    if (!riskyPhrases.length) return [];
    
    // Process and categorize risky phrases
    const { alwaysHighlightTerms, contextAwareTerms, aiDetectedPhrases } = processRiskyPhrases(riskyPhrases);
    
    // Comprehensive fallback: scan the entire paragraph for any policy terms
    const scannedTerms = scanParagraphForTerms(paragraph);
    scannedTerms.forEach(term => contextAwareTerms.add(term));
    
    // Filter context-aware terms using false positive filter
    const filteredContextTerms = filterFalsePositives(Array.from(contextAwareTerms));
    
    // Filter AI-detected phrases using false positive filter
    const filteredAiPhrases = filterFalsePositives(Array.from(aiDetectedPhrases));
    
    // Combine all filtered terms
    const allValidPhrases = Array.from(alwaysHighlightTerms)
      .concat(filteredContextTerms)
      .concat(filteredAiPhrases);
    
    // Final validation: ensure all phrases have valid category explanations
    return allValidPhrases.filter(phrase => {
      const phraseInfo = getPhraseCategoryAndExplanation(phrase, contextAnalysis);
      return phraseInfo !== null;
    });
  }, [riskyPhrases, paragraph, contextAnalysis]);
  
  if (!processedPhrases.length) return <>{paragraph}</>;
  
  // Performance optimization: Use chunked processing for large texts
  const highlightedContent = processTextInChunks(paragraph, processedPhrases, contextAnalysis);
  
  return <>{highlightedContent}</>;
}

// Performance optimization: Memoize component to prevent unnecessary re-renders
export default React.memo(TranscriptHighlighter); 
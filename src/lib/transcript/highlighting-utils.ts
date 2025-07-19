import React from 'react';
import { YOUTUBE_POLICY_TERMS, findPolicyTerm, getAllTerms } from '@/lib/youtube-policy-terms';
import { filterFalsePositives } from '@/lib/false-positive-filter';
import { getCategoryLabel } from './category-mapping';
import { getTermContext } from './context-filtering';
import { 
  ALWAYS_HIGHLIGHT_KEYWORDS, 
  PERFORMANCE_CONFIG 
} from '@/lib/constants/policy-terms';

export interface PhraseInfo {
  label: string;
  explanation: string;
  context?: string;
  severity: 'high' | 'medium';
}

// Performance optimization: Cache regex patterns to avoid rebuilding
const regexCache = new Map<string, RegExp>();
const CACHE_SIZE_LIMIT = PERFORMANCE_CONFIG.REGEX_CACHE_SIZE_LIMIT;

// Performance optimization: Chunk size for large text processing
const CHUNK_SIZE = PERFORMANCE_CONFIG.TEXT_CHUNK_SIZE;

/**
 * Performance optimization: Clear cache when it gets too large
 */
function clearCacheIfNeeded() {
  if (regexCache.size > CACHE_SIZE_LIMIT) {
    const entries = Array.from(regexCache.entries());
    // Remove oldest 20% of entries
    const toRemove = Math.floor(CACHE_SIZE_LIMIT * 0.2);
    entries.slice(0, toRemove).forEach(([key]) => regexCache.delete(key));
  }
}

/**
 * Performance optimization: Get cached regex or build new one
 */
function getCachedRegex(phrases: string[]): RegExp {
  const cacheKey = phrases.sort().join('|');
  
  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey)!;
  }
  
  const regex = buildHighlightingRegex(phrases);
  regexCache.set(cacheKey, regex);
  clearCacheIfNeeded();
  
  return regex;
}

/**
 * For a phrase, find the most relevant category and explanation using the policy terms database
 */
export function getPhraseCategoryAndExplanation(
  phrase: string, 
  contextAnalysis?: {
    content_type?: string;
    target_audience?: string;
  }
): PhraseInfo | null {
  const policyTerm = findPolicyTerm(phrase);
  if (!policyTerm) return null;
  
  // Get context information for this term
  const termContext = getTermContext(phrase, policyTerm.category, contextAnalysis);
  if (!termContext.shouldHighlight) {
    return null;
  }
  
  const label = getCategoryLabel(policyTerm.category);
  return { 
    label, 
    explanation: policyTerm.explanation,
    context: termContext.context,
    severity: termContext.severity
  };
}

/**
 * Process and categorize risky phrases for highlighting
 */
export function processRiskyPhrases(phrases: string[]): {
  alwaysHighlightTerms: Set<string>;
  contextAwareTerms: Set<string>;
  aiDetectedPhrases: Set<string>;
} {
  // Get all terms from the policy database for comprehensive scanning
  const allPolicyTerms = getAllTerms();
  const individualRiskyWords = new Set<string>();
  
  // Process AI-detected phrases first
  phrases.forEach(phrase => {
    const phraseLower = phrase.toLowerCase();
    
    // Check if the phrase itself is a policy term
    if (allPolicyTerms.includes(phraseLower)) {
      individualRiskyWords.add(phraseLower);
    }
    
    // Check if the phrase contains any policy terms
    allPolicyTerms.forEach(keyword => {
      if (phraseLower.includes(keyword.toLowerCase())) {
        individualRiskyWords.add(keyword);
      }
    });
    
    // Add the original phrase if it's reasonable length
    if (phrase.length <= 50) {
      individualRiskyWords.add(phrase);
    }
  });
  
  // Separate policy terms into different categories for different filtering logic
  const alwaysHighlightTerms = new Set<string>(); // Truly high-risk terms
  const contextAwareTerms = new Set<string>();    // Terms that need context checking
  const aiDetectedPhrases = new Set<string>();    // AI-detected phrases
  
  Array.from(individualRiskyWords).forEach(phrase => {
    const phraseLower = phrase.toLowerCase();
    
    if (ALWAYS_HIGHLIGHT_KEYWORDS.some(keyword => phraseLower.includes(keyword))) {
      // This is a truly high-risk term - always highlight
      alwaysHighlightTerms.add(phrase);
    } else if (allPolicyTerms.includes(phraseLower)) {
      // This is a policy term but not in always-highlight list - apply context filtering
      contextAwareTerms.add(phrase);
    } else {
      // This is an AI-detected phrase - apply false positive filtering
      aiDetectedPhrases.add(phrase);
    }
  });
  
  return {
    alwaysHighlightTerms,
    contextAwareTerms,
    aiDetectedPhrases
  };
}

/**
 * Comprehensive fallback: scan the entire paragraph for any policy terms
 */
export function scanParagraphForTerms(paragraph: string): Set<string> {
  const allPolicyTerms = getAllTerms();
  const transcriptLower = paragraph.toLowerCase();
  const foundTerms = new Set<string>();
  
  allPolicyTerms.forEach(keyword => {
    if (transcriptLower.includes(keyword.toLowerCase())) {
      foundTerms.add(keyword);
    }
  });
  
  return foundTerms;
}

/**
 * Performance optimization: Build a robust regex pattern for highlighting with caching
 */
export function buildHighlightingRegex(phrases: string[]): RegExp {
  // Sort phrases by length descending to avoid nested highlights
  const sortedPhrases = [...phrases].sort((a, b) => b.length - a.length);
  
  // Performance optimization: Limit regex pattern size to prevent browser freezing
  const maxPhrases = PERFORMANCE_CONFIG.MAX_REGEX_PHRASES;
  const limitedPhrases = sortedPhrases.slice(0, maxPhrases);
  
  // Build a robust regex pattern
  const regexPattern = limitedPhrases
    .map(phrase => {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use word boundaries for single words, allow partial matches for phrases
      return phrase.trim().split(' ').length === 1 ? `\\b${escaped}\\b` : escaped;
    })
    .join('|');
  
  return new RegExp(regexPattern, 'gi');
}

/**
 * Performance optimization: Process text in chunks for large content
 */
export function processTextInChunks(
  text: string, 
  phrases: string[], 
  contextAnalysis?: any
): (string | React.ReactElement)[] {
  // For small texts, use normal processing
  if (text.length <= CHUNK_SIZE) {
    return processTextWithRegex(text, phrases, contextAnalysis);
  }
  
  // For large texts, process in chunks
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }
  
  const results: (string | React.ReactElement)[] = [];
  chunks.forEach((chunk, index) => {
    const chunkResult = processTextWithRegex(chunk, phrases, contextAnalysis);
    results.push(...chunkResult);
  });
  
  return results;
}

/**
 * Performance optimization: Process text with cached regex
 */
function processTextWithRegex(
  text: string, 
  phrases: string[], 
  contextAnalysis?: any
): (string | React.ReactElement)[] {
  if (!phrases.length) return [text];
  
  const regex = getCachedRegex(phrases);
  const result: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    
    const matchedText = match[0];
    const phraseInfo = getPhraseCategoryAndExplanation(matchedText, contextAnalysis);
    
    if (phraseInfo) {
      const { tooltip, className } = getHighlightingStyles(phraseInfo);
      
      result.push(
        React.createElement('span', {
          key: match.index,
          className: className,
          title: tooltip
        }, matchedText)
      );
    } else {
      // Fallback for unmatched terms
      result.push(matchedText);
    }
    
    lastIndex = match.index + matchedText.length;
  }
  
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  
  return result;
}

/**
 * Generate tooltip text and CSS class for highlighted phrases
 */
export function getHighlightingStyles(phraseInfo: PhraseInfo): {
  tooltip: string;
  className: string;
} {
  if (phraseInfo.context) {
    // Context identified - yellow highlighting with context-aware tooltip
    const tooltip = `${phraseInfo.label}: ${phraseInfo.explanation} (Appears in ${phraseInfo.context} context - should be fine but consider limiting for maximum advertiser reach)`;
    const className = "inline-block px-1 py-0.5 rounded border bg-yellow-100 border-yellow-300 text-yellow-800 text-xs font-medium cursor-help";
    return { tooltip, className };
  } else {
    // No context identified - red highlighting with standard tooltip
    const tooltip = `${phraseInfo.label}: ${phraseInfo.explanation} (which can limit monetization and advertising possibilities regardless of context)`;
    const className = "inline-block px-1 py-0.5 rounded border bg-red-100 border-red-300 text-red-800 text-xs font-medium cursor-help";
    return { tooltip, className };
  }
} 
import { 
  PolicyCategoryAnalysis, 
  RiskAssessment, 
  RiskLevel,
  PriorityLevel,
  RiskSpan
} from '../../types/ai-analysis';
import { detectLanguage, isNonEnglish as isNonEnglishText } from '../constants/url-patterns';
import { getChunkConfig, ANALYSIS_MODES } from '../constants/analysis-config';
import { calculateOverallRiskScore, getRiskLevel, generateHighlights, cleanRiskyPhrases } from '../analysis-utils';
import { filterFalsePositives as filterFalsePositivesOptimized } from '../constants/false-positives';
import { mergeOverlappingSpans } from '../risk-assessment';
import he from 'he';
import { AnalysisContext, AnalysisProcessingResult } from './analysis-types';

/**
 * Prepare analysis context from input text
 */
export function prepareAnalysisContext(text: string): AnalysisContext {
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for analysis.');
  }

  // Check if the text appears to be in a non-English language
  const detectedLanguage = detectLanguage(text);
  const isNonEnglish = isNonEnglishText(text);
  
  if (isNonEnglish) {
    console.log(`Warning: Content appears to be in ${detectedLanguage}. This may affect analysis quality.`);
    console.log(`First 200 characters: ${text.substring(0, 200)}`);
  }

  // Double-decode transcript before chunking and sending to AI
  const decodedText = he.decode(he.decode(text));
  const { chunkSize, overlap, needsChunking } = getChunkConfig(decodedText.length);

  return {
    text,
    decodedText,
    detectedLanguage,
    isNonEnglish,
    needsChunking,
    chunkSize,
    overlap
  };
}

/**
 * Process risky phrases and spans with filtering and cleaning
 */
export function processRiskyContent(
  allRiskyPhrases: string[],
  allRiskySpans: RiskSpan[],
  riskAssessment?: RiskAssessment
): {
  cleanedRiskyPhrases: string[];
  cleanedRiskySpans: RiskSpan[];
  updatedRiskAssessment?: RiskAssessment;
} {
  // Deduplicate risky phrases
  let cleanedRiskyPhrases = Array.from(new Set(allRiskyPhrases.filter(Boolean)));
  
  // Filter out false positives from all risky phrases using optimized function
  cleanedRiskyPhrases = filterFalsePositivesOptimized(cleanedRiskyPhrases);
  
  // Also filter out false positives from risky_phrases_by_category
  let updatedRiskAssessment = riskAssessment;
  if (riskAssessment && riskAssessment.risky_phrases_by_category) {
    for (const category in riskAssessment.risky_phrases_by_category) {
      riskAssessment.risky_phrases_by_category[category] = 
        filterFalsePositivesOptimized(riskAssessment.risky_phrases_by_category[category]);
    }
    updatedRiskAssessment = riskAssessment;
  }

  // Clean and validate risky phrases to remove false positives
  console.log('Before cleaning - allRiskyPhrases:', cleanedRiskyPhrases);
  const originalCount = cleanedRiskyPhrases.length;
  cleanedRiskyPhrases = cleanRiskyPhrases(cleanedRiskyPhrases);
  const cleanedCount = cleanedRiskyPhrases.length;
  console.log(`After cleaning - allRiskyPhrases: ${cleanedCount}/${originalCount} phrases remaining:`, cleanedRiskyPhrases);
  
  if (updatedRiskAssessment && updatedRiskAssessment.risky_phrases_by_category) {
    console.log('Before cleaning - risky_phrases_by_category:', JSON.stringify(updatedRiskAssessment.risky_phrases_by_category, null, 2));
    for (const category in updatedRiskAssessment.risky_phrases_by_category) {
      const originalCategoryCount = updatedRiskAssessment.risky_phrases_by_category[category].length;
      updatedRiskAssessment.risky_phrases_by_category[category] = cleanRiskyPhrases(updatedRiskAssessment.risky_phrases_by_category[category]);
      const cleanedCategoryCount = updatedRiskAssessment.risky_phrases_by_category[category].length;
      console.log(`Category ${category}: ${cleanedCategoryCount}/${originalCategoryCount} phrases remaining`);
    }
    console.log('After cleaning - risky_phrases_by_category:', JSON.stringify(updatedRiskAssessment.risky_phrases_by_category, null, 2));
  }

  // Merge/expand overlapping or adjacent risky spans
  const cleanedRiskySpans = mergeOverlappingSpans(allRiskySpans, '');
  if (updatedRiskAssessment) {
    updatedRiskAssessment.risky_spans = cleanedRiskySpans;
  }

  return {
    cleanedRiskyPhrases,
    cleanedRiskySpans,
    updatedRiskAssessment
  };
}

/**
 * Calculate final analysis metrics
 */
export function calculateFinalMetrics(
  policyAnalysis: { [category: string]: PolicyCategoryAnalysis },
  riskAssessment?: RiskAssessment
): {
  overallRiskScore: number;
  riskLevel: RiskLevel;
  highlights: Array<{
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }>;
} {
  // Calculate overall risk score and level
  const overallRiskScore = calculateOverallRiskScore(policyAnalysis, riskAssessment);
  const riskLevel = getRiskLevel(overallRiskScore);
  console.log('Calculated overall risk score:', overallRiskScore, 'Risk level:', riskLevel);
  
  // Generate highlights from policy analysis
  const highlights = generateHighlights(policyAnalysis);

  return {
    overallRiskScore,
    riskLevel,
    highlights
  };
}

/**
 * Create analysis metadata
 */
export function createAnalysisMetadata(
  modelName: string,
  startTime: number,
  contentLength: number,
  analysisMode: keyof typeof ANALYSIS_MODES
): {
  model_used: string;
  analysis_timestamp: string;
  processing_time_ms: number;
  content_length: number;
  analysis_mode: typeof ANALYSIS_MODES[keyof typeof ANALYSIS_MODES];
} {
  return {
    model_used: modelName,
    analysis_timestamp: new Date().toISOString(),
    processing_time_ms: Date.now() - startTime,
    content_length: contentLength,
    analysis_mode: ANALYSIS_MODES[analysisMode]
  };
} 
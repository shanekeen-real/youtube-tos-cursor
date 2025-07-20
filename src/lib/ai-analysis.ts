import { getAIModel, AIModel, GeminiModel, ClaudeModel, RateLimiter, callAIWithRetry, getModelWithFallback } from './ai-models';
import { ChannelContext } from '../types/user';
import { parseJSONSafely, normalizeBatchScores, extractPartialAnalysis } from './json-utils';
import { jsonParsingService } from './json-parsing-service';
import { 
  YOUTUBE_POLICY_CATEGORIES, 
  PolicyCategoryAnalysis, 
  ContextAnalysis, 
  EnhancedAnalysisResult, 
  BatchAnalysisResult, 
  ContentClassification, 
  RiskSpan, 
  RiskAssessment, 
  ConfidenceAnalysis, 
  Suggestion,
  PolicyCategoryAnalysisSchema,
  BatchAnalysisSchema,
  ContextAnalysisSchema,
  RiskSpanSchema,
  RiskAssessmentSchema,
  ConfidenceAnalysisSchema,
  SuggestionSchema,
  SuggestionsSchema,
  ContentClassificationSchema,
  RiskLevel,
  PriorityLevel,
  SeverityLevel
} from '../types/ai-analysis';

// Type for basic analysis result
interface BasicAnalysisResult {
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
import { usageTracker } from './usage-tracker';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import he from 'he';
import { filterFalsePositives } from './false-positive-filter';
import { performContextAnalysis } from './context-analysis';
import { performPolicyCategoryAnalysisBatched } from './policy-analysis';
import { performRiskAssessment, mergeOverlappingSpans } from './risk-assessment';
import { performConfidenceAnalysis } from './confidence-analysis';
import { generateActionableSuggestions } from './suggestions';
import { performAIDetection } from './ai-detection';
import { performAnalysis, analyzePolicyCategories } from './legacy-analysis';
import { calculateOverallRiskScore, getRiskLevel, generateHighlights, cleanRiskyPhrases } from './analysis-utils';
import { FALSE_POSITIVE_WORDS, filterFalsePositives as filterFalsePositivesOptimized } from './constants/false-positives';
import { 
  TEXT_PROCESSING, 
  PERFORMANCE_LIMITS, 
  RISK_THRESHOLDS, 
  ANALYSIS_MODES,
  getRiskLevel as getRiskLevelFromConfig,
  getChunkConfig 
} from './constants/analysis-config';
import { detectLanguage, isNonEnglish as isNonEnglishText } from './constants/url-patterns';

const rateLimiter = new RateLimiter();

// Multi-stage analysis pipeline with fallback
export async function performEnhancedAnalysis(text: string, channelContext?: ChannelContext): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  
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

  const model = getModelWithFallback();
  let allRiskySpans: RiskSpan[] = [];
  let riskAssessment: RiskAssessment | undefined;

  // Double-decode transcript before chunking and sending to AI
  const decodedText = he.decode(he.decode(text));
  const { chunkSize, overlap, needsChunking } = getChunkConfig(decodedText.length);

  try {
    // Stage 1: Content Classification
    await rateLimiter.waitIfNeeded();
    const contextAnalysis = await performContextAnalysis(decodedText, model);
    
    // Stage 1.5: AI Detection (if channel context available)
    let aiDetectionResult = null;
    if (channelContext) {
      aiDetectionResult = await performAIDetection(decodedText, model, channelContext);
    }
    
    // Stage 2: Policy Category Analysis (with batching)
    const policyAnalysis = await performPolicyCategoryAnalysisBatched(decodedText, model, contextAnalysis);

    // Stage 3: Risk Assessment (with chunking for long transcripts)
    await rateLimiter.waitIfNeeded();
    let allRiskyPhrases: string[] = [];
    console.log('Policy analysis results:', JSON.stringify(policyAnalysis, null, 2));
    if (needsChunking) {
      // Split decoded transcript into overlapping chunks
      const chunks: { text: string; start: number }[] = [];
      let pos = 0;
      while (pos < decodedText.length) {
        const chunkText = decodedText.slice(pos, pos + chunkSize);
        chunks.push({ text: chunkText, start: pos });
        if (pos + chunkSize >= decodedText.length) break;
        pos += chunkSize - overlap;
      }
      // Run risk assessment on each chunk and merge results
      for (const chunk of chunks) {
        const chunkAssessment = await performRiskAssessment(chunk.text, model, policyAnalysis, contextAnalysis, true);
        if (chunkAssessment && chunkAssessment.risky_phrases_by_category) {
          const phraseArrays: string[][] = Object.values(chunkAssessment.risky_phrases_by_category);
          for (const phrases of phraseArrays) {
            allRiskyPhrases.push(...phrases);
          }
        }
        if (!riskAssessment) riskAssessment = chunkAssessment;
      }
      // Merge/expand overlapping or adjacent risky spans
      allRiskySpans = mergeOverlappingSpans(allRiskySpans, decodedText);
      if (riskAssessment) riskAssessment.risky_spans = allRiskySpans;
    } else {
      riskAssessment = await performRiskAssessment(decodedText, model, policyAnalysis, contextAnalysis, true);
      console.log('Risk assessment results:', JSON.stringify(riskAssessment, null, 2));
      if (riskAssessment && riskAssessment.risky_phrases_by_category) {
        const phraseArrays: string[][] = Object.values(riskAssessment.risky_phrases_by_category);
        for (const phrases of phraseArrays) {
          allRiskyPhrases.push(...phrases);
        }
      }
      allRiskySpans = riskAssessment.risky_spans || [];
    }
    // Deduplicate risky phrases
    allRiskyPhrases = Array.from(new Set(allRiskyPhrases.filter(Boolean)));
    
    // Filter out false positives from all risky phrases using optimized function
    allRiskyPhrases = filterFalsePositivesOptimized(allRiskyPhrases);
    
    // Also filter out false positives from risky_phrases_by_category
    if (riskAssessment && riskAssessment.risky_phrases_by_category) {
      for (const category in riskAssessment.risky_phrases_by_category) {
        riskAssessment.risky_phrases_by_category[category] = 
          filterFalsePositivesOptimized(riskAssessment.risky_phrases_by_category[category]);
      }
    }

    // Stage 4: Confidence Analysis
    await rateLimiter.waitIfNeeded();
    const confidenceAnalysis = await performConfidenceAnalysis(decodedText, model, policyAnalysis, contextAnalysis);
    
    // Stage 5: Generate Actionable Suggestions
    await rateLimiter.waitIfNeeded();
    const suggestions = await generateActionableSuggestions(decodedText, model, policyAnalysis, riskAssessment || {
      overall_risk_score: 0,
      flagged_section: 'Analysis incomplete',
      risk_factors: [],
      severity_level: 'LOW',
      risky_phrases_by_category: {},
    });
    
    // Apply hard limit to suggestions to prevent overwhelming users
    const limitedSuggestions = suggestions.slice(0, PERFORMANCE_LIMITS.MAX_SUGGESTIONS);
    
    // Calculate overall risk score and level
    const overallRiskScore = calculateOverallRiskScore(policyAnalysis, riskAssessment);
    const riskLevel = getRiskLevelFromConfig(overallRiskScore);
    console.log('Calculated overall risk score:', overallRiskScore, 'Risk level:', riskLevel);
    
    // Clean and validate risky phrases to remove false positives
    console.log('Before cleaning - allRiskyPhrases:', allRiskyPhrases);
    const originalCount = allRiskyPhrases.length;
    allRiskyPhrases = cleanRiskyPhrases(allRiskyPhrases);
    const cleanedCount = allRiskyPhrases.length;
    console.log(`After cleaning - allRiskyPhrases: ${cleanedCount}/${originalCount} phrases remaining:`, allRiskyPhrases);
    
    if (riskAssessment && riskAssessment.risky_phrases_by_category) {
      console.log('Before cleaning - risky_phrases_by_category:', JSON.stringify(riskAssessment.risky_phrases_by_category, null, 2));
      for (const category in riskAssessment.risky_phrases_by_category) {
        const originalCategoryCount = riskAssessment.risky_phrases_by_category[category].length;
        riskAssessment.risky_phrases_by_category[category] = cleanRiskyPhrases(riskAssessment.risky_phrases_by_category[category]);
        const cleanedCategoryCount = riskAssessment.risky_phrases_by_category[category].length;
        console.log(`Category ${category}: ${cleanedCategoryCount}/${originalCategoryCount} phrases remaining`);
      }
      console.log('After cleaning - risky_phrases_by_category:', JSON.stringify(riskAssessment.risky_phrases_by_category, null, 2));
    }
    
    // Generate highlights from policy analysis
    const highlights = generateHighlights(policyAnalysis);
    
    const processingTime = Date.now() - startTime;
    
    // Remove any accidental 'categories' key from policyAnalysis (artifact of fallback parsing)
    delete policyAnalysis['categories'];
    
    // Add AI detection to policy categories if available
    if (aiDetectionResult) {
      policyAnalysis["AI_GENERATED_CONTENT"] = {
        risk_score: aiDetectionResult.ai_probability,
        confidence: aiDetectionResult.confidence,
        violations: aiDetectionResult.patterns,
        severity: aiDetectionResult.ai_probability > 70 ? 'HIGH' : aiDetectionResult.ai_probability > 40 ? 'MEDIUM' : 'LOW',
        explanation: aiDetectionResult.explanation
      };
    }
    
    return {
      risk_score: overallRiskScore,
      risk_level: riskLevel,
      confidence_score: confidenceAnalysis.overall_confidence,
      flagged_section: riskAssessment?.flagged_section || 'Analysis incomplete',
      policy_categories: policyAnalysis,
      context_analysis: {
        content_type: contextAnalysis.content_type,
        target_audience: contextAnalysis.target_audience,
        monetization_impact: contextAnalysis.monetization_impact,
        content_length: contextAnalysis.content_length,
        language_detected: contextAnalysis.language_detected
      },
      highlights,
      suggestions: limitedSuggestions,
      risky_spans: allRiskySpans,
      risky_phrases: allRiskyPhrases,
      risky_phrases_by_category: riskAssessment?.risky_phrases_by_category || {},
      ai_detection: aiDetectionResult ? {
        probability: aiDetectionResult.ai_probability,
        confidence: aiDetectionResult.confidence,
        patterns: aiDetectionResult.patterns,
        indicators: aiDetectionResult.indicators,
        explanation: aiDetectionResult.explanation
      } : null,
      analysis_metadata: {
        model_used: model.name,
        analysis_timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
        content_length: decodedText.length,
        analysis_mode: ANALYSIS_MODES.ENHANCED
      }
    };
  } catch (error: unknown) {
    const enhancedError = error as Error;
    console.log('Enhanced analysis failed, falling back to basic analysis:', enhancedError.message);
    
    // Track critical errors with Sentry
    Sentry.captureException(enhancedError, {
      tags: { component: 'ai-analysis', stage: 'enhanced' },
      extra: { 
        textLength: text.length,
        modelUsed: model.name 
      }
    });
    
    try {
      // Fallback to basic analysis
      const basicResult = await performBasicAnalysis(text, model);
      const processingTime = Date.now() - startTime;
      
      return {
        risk_score: basicResult.risk_score,
        risk_level: basicResult.risk_level,
        confidence_score: RISK_THRESHOLDS.DEFAULT_CONFIDENCE, // Default confidence for basic analysis
        flagged_section: basicResult.flagged_section,
        policy_categories: {}, // No detailed categories in basic mode
        context_analysis: {
          content_type: 'General',
          target_audience: 'General Audience',
          monetization_impact: 50,
          content_length: text.split(' ').length,
          language_detected: detectedLanguage
        },
        highlights: basicResult.highlights,
        suggestions: basicResult.suggestions,
        risky_spans: [], // No risky spans in basic mode
        risky_phrases: [], // No risky phrases in basic mode
        risky_phrases_by_category: {}, // No categorized phrases in basic mode
        analysis_metadata: {
          model_used: model.name,
          analysis_timestamp: new Date().toISOString(),
          processing_time_ms: processingTime,
          content_length: text.length,
          analysis_mode: ANALYSIS_MODES.FALLBACK
        }
      };
    } catch (basicError: unknown) {
      const basicAnalysisError = basicError as Error;
      console.log('Basic analysis also failed, using emergency fallback:', basicAnalysisError.message);
      
      // Track fallback failures with Sentry
      Sentry.captureException(basicAnalysisError, {
        tags: { component: 'ai-analysis', stage: 'basic-fallback' },
        extra: { 
          textLength: text.length,
          modelUsed: model.name,
          originalError: enhancedError.message
        }
      });
      
      // Emergency fallback - no AI required
      const processingTime = Date.now() - startTime;
      const wordCount = text.split(' ').length;
      
      return {
        risk_score: RISK_THRESHOLDS.EMERGENCY_RISK_SCORE, // Neutral score
        risk_level: 'MEDIUM',
        confidence_score: 25, // Low confidence since no AI analysis
        flagged_section: 'Content analysis unavailable due to service limits',
        policy_categories: {},
        context_analysis: {
          content_type: 'General',
          target_audience: 'General Audience',
          monetization_impact: 50,
          content_length: wordCount,
          language_detected: 'Unknown'
        },
        highlights: [{
          category: 'Service Status',
          risk: 'Analysis Unavailable',
          score: 0,
          confidence: 25
        }],
        suggestions: [{
          title: 'Service Temporarily Unavailable',
          text: 'AI analysis service is currently at capacity. Please try again later or contact support.',
          priority: 'HIGH',
          impact_score: 0
        }],
        risky_spans: [], // No risky spans in emergency mode
        risky_phrases: [], // No risky phrases in emergency mode
        risky_phrases_by_category: {}, // No categorized phrases in emergency mode
        analysis_metadata: {
          model_used: 'emergency-fallback',
          analysis_timestamp: new Date().toISOString(),
          processing_time_ms: processingTime,
          content_length: text.length,
          analysis_mode: 'emergency'
        }
      };
    }
  }
}

// Basic analysis fallback
async function performBasicAnalysis(text: string, model: AIModel) {
  const prompt = `
    Act as an expert YouTube policy analyst. Your task is to analyze the following text content and provide a detailed risk assessment based on YouTube's community guidelines and advertiser-friendly policies.

    The user's content to analyze is:
    ---
    "${text}"
    ---

    Based on this content, perform the following actions:

    1.  **Calculate an Overall Risk Score:** Provide a numerical score from 0 (no risk) to 100 (high risk). This score should reflect the content's likelihood of being demonetized or removed. A score of 0-34 is LOW risk, 35-69 is MEDIUM risk, and 70-100 is HIGH risk.

    2.  **Identify the Risk Level:** Based on the score, classify the risk as "LOW", "MEDIUM", or "HIGH".

    3.  **Provide a Flagged Section:** Write a concise, one-sentence summary of the single most significant risk found in the text.

    4.  **Create Risk Highlights:** Identify up to 4 specific policy areas that are at risk. For each highlight, provide the category (e.g., "Hate Speech," "Graphic Violence," "Misinformation"), a risk level ("high", "medium", or "low"), and a confidence score (0-100).

    5.  **Generate Actionable Suggestions:** Provide 5-8 specific, actionable suggestions for how the user can improve their content to reduce the identified risks. Each suggestion should have a title and a descriptive text.

    Please return your analysis **only** as a valid JSON object, with no other text or explanation. The JSON object must follow this exact structure:
    {
      "risk_score": <number>,
      "risk_level": "<string>",
      "flagged_section": "<string>",
      "highlights": [
        {
          "category": "<string>",
          "risk": "<string>",
          "score": <number>
        }
      ],
      "suggestions": [
        {
          "title": "<string>",
          "text": "<string>"
        }
      ]
    }
  `;

  const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
  
  // Use the robust JSON parsing service
  const expectedSchema = z.object({
    risk_score: z.number(),
    risk_level: z.string(),
    flagged_section: z.string(),
    highlights: z.array(z.object({
      category: z.string(),
      risk: z.string(),
      score: z.number()
    })),
    suggestions: z.array(z.object({
      title: z.string(),
      text: z.string()
    }))
  });

  const parsingResult = await jsonParsingService.parseJson<BasicAnalysisResult>(result, expectedSchema, model);
  
  if (parsingResult.success && parsingResult.data) {
    const parsedResult = parsingResult.data;
    
    // Apply hard limit of 12 suggestions to prevent overwhelming users
    if (parsedResult.suggestions && parsedResult.suggestions.length > 12) {
      console.log(`[DEBUG] Basic analysis returned ${parsedResult.suggestions.length} suggestions, limiting to 12`);
      parsedResult.suggestions = parsedResult.suggestions.slice(0, 12);
    }
    
    // Transform the parsed result to match the expected structure
    const transformedResult: BasicAnalysisResult = {
      risk_score: parsedResult.risk_score,
      risk_level: parsedResult.risk_level as RiskLevel,
      flagged_section: parsedResult.flagged_section,
      highlights: parsedResult.highlights.map(highlight => ({
        ...highlight,
        confidence: 75 // Default confidence for basic analysis
      })),
      suggestions: parsedResult.suggestions.map(suggestion => ({
        ...suggestion,
        priority: 'MEDIUM' as const, // Default priority for basic analysis
        impact_score: 50 // Default impact score for basic analysis
      }))
    };
    
    return transformedResult;
  } else {
    throw new Error(`Basic analysis JSON parsing failed: ${parsingResult.error}`);
  }
}
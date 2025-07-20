import { getAIModel, AIModel, callAIWithRetry } from '../ai-models';
import { jsonParsingService } from '../json-parsing-service';
import { RISK_THRESHOLDS, ANALYSIS_MODES } from '../constants/analysis-config';
import { BasicAnalysisResult, EmergencyFallbackResult } from './analysis-types';
import { RiskLevel, PriorityLevel } from '../../types/ai-analysis';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

/**
 * Basic analysis fallback
 */
export async function performBasicAnalysis(text: string, model: AIModel): Promise<BasicAnalysisResult> {
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

/**
 * Emergency fallback - no AI required
 */
export function createEmergencyFallbackResult(
  text: string,
  startTime: number,
  detectedLanguage: string
): EmergencyFallbackResult {
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
        analysis_mode: ANALYSIS_MODES.EMERGENCY
      }
  };
}

/**
 * Handle analysis errors with proper fallback chain
 */
export async function handleAnalysisError(
  error: unknown,
  text: string,
  model: AIModel,
  startTime: number,
  detectedLanguage: string
): Promise<EmergencyFallbackResult> {
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
    return createEmergencyFallbackResult(text, startTime, detectedLanguage);
  }
} 
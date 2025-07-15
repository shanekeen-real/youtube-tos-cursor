import { getAIModel, AIModel, GeminiModel, ClaudeModel, RateLimiter, callAIWithRetry, getModelWithFallback } from './ai-models';
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
  ContentClassificationSchema
} from '../types/ai-analysis';
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

const rateLimiter = new RateLimiter();

// Multi-stage analysis pipeline with fallback
export async function performEnhancedAnalysis(text: string, channelContext?: any): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for analysis.');
  }

  // Check if the text appears to be in a non-English language
  const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  const isChinese = /[\u4E00-\u9FFF]/.test(text);
  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const isKorean = /[\uAC00-\uD7AF]/.test(text);
  const isThai = /[\u0E00-\u0E7F]/.test(text);
  const isHindi = /[\u0900-\u097F]/.test(text);
  
  const isNonEnglish = isArabic || isChinese || isJapanese || isKorean || isThai || isHindi;
  
  let detectedLanguage = 'English';
  if (isArabic) detectedLanguage = 'Arabic';
  else if (isChinese) detectedLanguage = 'Chinese';
  else if (isJapanese) detectedLanguage = 'Japanese';
  else if (isKorean) detectedLanguage = 'Korean';
  else if (isThai) detectedLanguage = 'Thai';
  else if (isHindi) detectedLanguage = 'Hindi';
  
  if (isNonEnglish) {
    console.log(`Warning: Content appears to be in ${detectedLanguage}. This may affect analysis quality.`);
    console.log(`First 200 characters: ${text.substring(0, 200)}`);
  }

  const model = getModelWithFallback();
  const CHUNK_SIZE = 3500;
  const CHUNK_OVERLAP = 250;
  let allRiskySpans: any[] = [];
  let riskAssessment: any;

  // Double-decode transcript before chunking and sending to AI
  const decodedText = he.decode(he.decode(text));

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
    if (decodedText.length > CHUNK_SIZE) {
      // Split decoded transcript into overlapping chunks
      const chunks: { text: string; start: number }[] = [];
      let pos = 0;
      while (pos < decodedText.length) {
        const chunkText = decodedText.slice(pos, pos + CHUNK_SIZE);
        chunks.push({ text: chunkText, start: pos });
        if (pos + CHUNK_SIZE >= decodedText.length) break;
        pos += CHUNK_SIZE - CHUNK_OVERLAP;
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
    
    // Filter out false positives - common words that shouldn't be flagged
    const falsePositiveWords = [
      'you', 'worried', 'rival', 'team', 'player', 'goal', 'score', 'match', 'game', 'play', 
      'win', 'lose', 'good', 'bad', 'big', 'small', 'new', 'old', 'first', 'last', 'best', 'worst',
      'money', 'dollar', 'price', 'cost', 'value', 'worth', 'expensive', 'cheap', 'million', 'billion',
      'year', 'month', 'week', 'day', 'time', 'people', 'person', 'thing', 'way', 'day', 'work',
      'make', 'take', 'get', 'go', 'come', 'see', 'know', 'think', 'feel', 'want', 'need', 'like',
      'look', 'say', 'tell', 'ask', 'give', 'find', 'use', 'try', 'call', 'help', 'start', 'stop',
      'keep', 'put', 'bring', 'turn', 'move', 'change', 'show', 'hear', 'play', 'run', 'walk',
      'sit', 'stand', 'wait', 'watch', 'read', 'write', 'speak', 'talk', 'listen', 'learn', 'teach',
      'buy', 'sell', 'pay', 'earn', 'spend', 'save', 'lose', 'win', 'beat', 'hit', 'catch', 'throw',
      'kick', 'run', 'jump', 'swim', 'dance', 'sing', 'laugh', 'cry', 'smile', 'frown', 'love', 'hate',
      'like', 'dislike', 'happy', 'sad', 'angry', 'excited', 'bored', 'tired', 'hungry', 'thirsty',
      'hot', 'cold', 'warm', 'cool', 'fast', 'slow', 'quick', 'easy', 'hard', 'simple', 'complex',
      'right', 'wrong', 'true', 'false', 'yes', 'no', 'maybe', 'sure', 'okay', 'fine', 'great', 'awesome',
      // Add common harmless words that are being flagged
      'kid', 'kids', 'phone', 'device', 'child', 'children', 'boy', 'girl', 'son', 'daughter',
      'family', 'parent', 'mom', 'dad', 'mother', 'father', 'sister', 'brother', 'baby', 'toddler',
      'teen', 'teenager', 'youth', 'young', 'old', 'elderly', 'senior', 'adult', 'grown', 'grownup',
      'mobile', 'cell', 'smartphone', 'iphone', 'android', 'tablet', 'computer', 'laptop', 'desktop',
      'screen', 'display', 'monitor', 'keyboard', 'mouse', 'touch', 'tap', 'swipe', 'click', 'type',
      'text', 'message', 'call', 'ring', 'dial', 'number', 'contact', 'address', 'email', 'mail',
      'home', 'house', 'room', 'bedroom', 'kitchen', 'bathroom', 'living', 'dining', 'office', 'work',
      'school', 'class', 'teacher', 'student', 'classroom', 'homework', 'study', 'learn', 'education',
      'friend', 'buddy', 'pal', 'mate', 'colleague', 'neighbor', 'cousin', 'uncle', 'aunt', 'grandma',
      'grandpa', 'grandmother', 'grandfather', 'nephew', 'niece', 'relative', 'relation', 'family'
    ];
    
    // Filter out false positives from all risky phrases
    allRiskyPhrases = allRiskyPhrases.filter((phrase: string) => 
      !falsePositiveWords.some(falsePositive => 
        phrase.toLowerCase().includes(falsePositive.toLowerCase())
      )
    );
    
    // Also filter out false positives from risky_phrases_by_category
    if (riskAssessment && riskAssessment.risky_phrases_by_category) {
      for (const category in riskAssessment.risky_phrases_by_category) {
        riskAssessment.risky_phrases_by_category[category] = 
          riskAssessment.risky_phrases_by_category[category].filter((phrase: string) => 
            !falsePositiveWords.some(falsePositive => 
              phrase.toLowerCase().includes(falsePositive.toLowerCase())
            )
          );
      }
    }

    // Stage 4: Confidence Analysis
    await rateLimiter.waitIfNeeded();
    const confidenceAnalysis = await performConfidenceAnalysis(decodedText, model, policyAnalysis, contextAnalysis);
    
    // Stage 5: Generate Actionable Suggestions
    await rateLimiter.waitIfNeeded();
    const suggestions = await generateActionableSuggestions(decodedText, model, policyAnalysis, riskAssessment);
    
    // Apply hard limit of 12 suggestions to prevent overwhelming users
    const limitedSuggestions = suggestions.slice(0, 12);
    
    // Calculate overall risk score and level
    const overallRiskScore = calculateOverallRiskScore(policyAnalysis, riskAssessment);
    const riskLevel = getRiskLevel(overallRiskScore);
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
      flagged_section: riskAssessment.flagged_section,
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
      risky_phrases_by_category: riskAssessment.risky_phrases_by_category || {},
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
        analysis_mode: 'enhanced'
      }
    };
  } catch (error: any) {
    console.log('Enhanced analysis failed, falling back to basic analysis:', error.message);
    
    // Track critical errors with Sentry
    Sentry.captureException(error, {
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
        confidence_score: 75, // Default confidence for basic analysis
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
          analysis_mode: 'fallback'
        }
      };
    } catch (basicError: any) {
      console.log('Basic analysis also failed, using emergency fallback:', basicError.message);
      
      // Track fallback failures with Sentry
      Sentry.captureException(basicError, {
        tags: { component: 'ai-analysis', stage: 'basic-fallback' },
        extra: { 
          textLength: text.length,
          modelUsed: model.name,
          originalError: error.message
        }
      });
      
      // Emergency fallback - no AI required
      const processingTime = Date.now() - startTime;
      const wordCount = text.split(' ').length;
      
      return {
        risk_score: 50, // Neutral score
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

  const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
  
  if (parsingResult.success && parsingResult.data) {
    const parsedResult = parsingResult.data;
    
    // Apply hard limit of 12 suggestions to prevent overwhelming users
    if (parsedResult.suggestions && parsedResult.suggestions.length > 12) {
      console.log(`[DEBUG] Basic analysis returned ${parsedResult.suggestions.length} suggestions, limiting to 12`);
      parsedResult.suggestions = parsedResult.suggestions.slice(0, 12);
    }
    
    return parsedResult;
  } else {
    throw new Error(`Basic analysis JSON parsing failed: ${parsingResult.error}`);
  }
}
import { getAIModel, SmartAIModel } from './ai-models';
import { parseJSONSafely } from './json-utils';
import { 
  YOUTUBE_POLICY_CATEGORIES, 
  PolicyCategoryAnalysis, 
  ContextAnalysis, 
  EnhancedAnalysisResult, 
  RiskAssessment, 
  ConfidenceAnalysis, 
  Suggestion,
  PolicyCategoryAnalysisSchema,
  ContextAnalysisSchema,
  RiskAssessmentSchema,
  ConfidenceAnalysisSchema,
  SuggestionSchema,
  SuggestionsSchema
} from '../types/ai-analysis';
import { usageTracker } from './usage-tracker';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import { filterFalsePositives } from './false-positive-filter';
import { performContextAnalysis } from './context-analysis';
import { performPolicyCategoryAnalysisBatched } from './policy-analysis';
import { performRiskAssessment, mergeOverlappingSpans } from './risk-assessment';
import { performConfidenceAnalysis } from './confidence-analysis';
import { generateActionableSuggestions } from './suggestions';
import { performAIDetection } from './ai-detection';
import { calculateOverallRiskScore, getRiskLevel, generateHighlights, cleanRiskyPhrases } from './analysis-utils';
import { VideoAnalysisData } from './video-processing';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';

/**
 * Multi-modal video analysis using Gemini 2.5 Flash Preview
 */
export async function performMultiModalVideoAnalysis(
  videoData: VideoAnalysisData,
  channelContext?: any
): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log('Starting multi-modal video analysis with smart queuing');
    
    const model = getAIModel() as SmartAIModel;
    
    // Check if model supports multi-modal analysis
    if (!model.supportsMultiModal) {
      console.warn('Model does not support multi-modal analysis, falling back to text-only');
      return await performTextOnlyAnalysis(videoData, channelContext);
    }

    // Stage 1: Get video context from Gemini (CRUCIAL for accuracy)
    console.log('Stage 1: Getting video context from Gemini');
    const videoContext = await model.getVideoContextWithGemini(
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    console.log('Video context obtained from Gemini:', videoContext.substring(0, 200) + '...');

    // Stage 2: Multi-modal content classification using video context
    console.log('Stage 2: Multi-modal content classification');
    const contextAnalysis = await performMultiModalContextAnalysis(videoData, model, videoContext);
    
    // Stage 3: AI Detection (if channel context available)
    let aiDetectionResult = null;
    if (channelContext) {
      if (videoData.transcript) {
        // Use transcript-based AI detection with video context
        console.log('Stage 3: Transcript-based AI detection with video context');
        aiDetectionResult = await performAIDetectionWithContext(videoData.transcript, model, channelContext, videoContext);
      } else {
        // Use multi-modal AI detection with video content analysis
        console.log('Stage 3: Multi-modal AI detection (no transcript available)');
        aiDetectionResult = await performMultiModalAIDetection(videoData, model, channelContext, contextAnalysis);
      }
      console.log('AI detection result:', aiDetectionResult);
    } else {
      console.log('Stage 3: Skipping AI detection (no channel context available)');
    }
    
    // Stage 4: Policy analysis using video context
    console.log('Stage 4: Policy analysis with video context');
    const policyCategories = await performMultiModalPolicyAnalysis(videoData, model, contextAnalysis, videoContext);
    
    // Stage 5: Risk assessment using video context
    console.log('Stage 5: Risk assessment with video context');
    const riskAssessment = await performMultiModalRiskAssessment(videoData, model, contextAnalysis, videoContext);
    
    // Stage 6: Confidence analysis using video context
    console.log('Stage 6: Confidence analysis with video context');
    const confidenceAnalysis = await performConfidenceAnalysisWithContext(
      videoData.transcript || 'Video content analysis',
      model,
      Object.entries(policyCategories).map(([category, data]) => ({ ...data, category })),
      contextAnalysis,
      videoContext
    );
    
    // Stage 7: Generate suggestions using video context
    console.log('Stage 7: Generating suggestions with video context');
    const suggestions = await generateActionableSuggestionsWithContext(
      videoData.transcript || 'Video content analysis',
      model,
      Object.entries(policyCategories).map(([category, data]) => ({ ...data, category })),
      riskAssessment,
      videoContext
    );

    // Calculate overall risk score and level
    const overallRiskScore = calculateOverallRiskScore(policyCategories, riskAssessment);
    const riskLevel = getRiskLevel(overallRiskScore);
    
    // Generate highlights from policy analysis
    const highlights = generateHighlights(policyCategories);
    
    // Clean risky phrases
    const allRiskyPhrases = riskAssessment.risky_phrases_by_category ? 
      Object.values(riskAssessment.risky_phrases_by_category).flat() : [];
    const cleanedRiskyPhrases = cleanRiskyPhrases(allRiskyPhrases);
    
    // Get queue status for monitoring
    const queueStatus = model.getQueueStatus();
    console.log('Queue status:', queueStatus);
    
    // Combine all analysis results in the expected EnhancedAnalysisResult format
    const analysisResult: EnhancedAnalysisResult = {
      risk_score: overallRiskScore,
      risk_level: riskLevel,
      confidence_score: confidenceAnalysis.overall_confidence,
      flagged_section: riskAssessment.flagged_section,
      policy_categories: policyCategories,
      context_analysis: {
        content_type: contextAnalysis.content_type,
        target_audience: contextAnalysis.target_audience,
        monetization_impact: contextAnalysis.monetization_impact,
        content_length: contextAnalysis.content_length,
        language_detected: contextAnalysis.language_detected
      },
      highlights,
      suggestions: suggestions.slice(0, 12), // Apply hard limit
      risky_spans: riskAssessment.risky_spans || [],
      risky_phrases: cleanedRiskyPhrases,
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
        processing_time_ms: Date.now() - startTime,
        content_length: (videoData.transcript || '').length,
        analysis_mode: 'multi-modal',
        queue_status: queueStatus
      }
    };
    
    console.log('Multi-modal analysis completed successfully with smart queuing');
    return analysisResult;
    
  } catch (error: any) {
    console.error('Multi-modal analysis failed:', error);
    Sentry.captureException(error, {
      tags: { component: 'multi-modal-analysis', action: 'perform-analysis' },
      extra: { videoId: videoData.videoPath }
    });
    
    // Fallback to text-only analysis
    console.log('Falling back to text-only analysis');
    return await performTextOnlyAnalysis(videoData, channelContext);
  }
}

/**
 * Multi-modal context analysis
 */
async function performMultiModalContextAnalysis(videoData: VideoAnalysisData, model: SmartAIModel, videoContext: string): Promise<ContextAnalysis> {
  const expectedSchema = {
    content_type: "string (Educational|Entertainment|Gaming|Music|Tutorial|Review|Vlog|Other)",
    target_audience: "string (General Audience|Teens|Children|Professional|Educational|Other)",
    monetization_impact: "number (0-100)",
    content_length: "number (word count)",
    language_detected: "string (English|Spanish|French|German|Other)",
    content_quality: "string (high|medium|low)",
    engagement_level: "string (high|medium|low)",
    visual_elements: ["array of visual elements detected"],
    audio_quality: "string (high|medium|low)",
    production_value: "string (high|medium|low)",
    content_complexity: "string (simple|moderate|complex)",
    brand_safety_concerns: ["array of brand safety concerns"],
    monetization_potential: "string (high|medium|low)"
  };
  const exampleResponse = {
    content_type: "Vlog",
    target_audience: "General Audience",
    monetization_impact: 70,
    content_length: 5000,
    language_detected: "English",
    content_quality: "medium",
    engagement_level: "high",
    visual_elements: ["gradient overlay", "enhanced colors"],
    audio_quality: "medium",
    production_value: "low",
    content_complexity: "moderate",
    brand_safety_concerns: ["drug use", "illegal activities"],
    monetization_potential: "medium"
  };
  const basePrompt = `Analyze this video content and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `Video Content: ${videoData.videoPath ? 'Video file available for analysis' : 'No video file'}\n` +
    `${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}\n` +
    `${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}\n` +
    `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateMultiModalContent!(
      robustPrompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    const parsingResult = await jsonParsingService.parseJson<ContextAnalysis>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      console.log(`Multi-modal context analysis completed using ${parsingResult.strategy}`);
      const validationResult = ContextAnalysisSchema.safeParse(parsingResult.data);
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Context analysis validation failed:', validationResult.error);
        throw new Error('Invalid context analysis response');
      }
    } else {
      console.error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    // Fallback to text-only context analysis with video context
    const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
    return await performContextAnalysis(fallbackText, model);
  }
}

/**
 * Multi-modal policy analysis
 */
async function performMultiModalPolicyAnalysis(
  videoData: VideoAnalysisData,
  model: SmartAIModel,
  contextAnalysis: ContextAnalysis,
  videoContext: string
): Promise<{ [category: string]: PolicyCategoryAnalysis }> {
  const expectedSchema = {
    category: "string (policy category name)",
    risk_level: "string (low|medium|high|critical)",
    confidence: "number (0-100)",
    description: "string (detailed analysis of visual and audio content)",
    visual_evidence: ["list of visual elements that support this assessment"],
    audio_evidence: ["list of audio/transcript elements that support this assessment"],
    recommendations: ["list of specific recommendations for this category"]
  };
  const exampleResponse = {
    category: "Violence",
    risk_level: "low",
    confidence: 85,
    description: "No violent content detected in visual or audio elements",
    visual_evidence: ["No violent imagery present"],
    audio_evidence: ["No violent language in transcript"],
    recommendations: ["Continue to avoid violent content"]
  };
  const basePrompt = `Analyze this YouTube video content (both visual and audio/transcript) for policy violations across all categories:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}\n` +
    `${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}\n` +
    `Context: ${JSON.stringify(contextAnalysis)}\n` +
    `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateMultiModalContent!(
      robustPrompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      console.log(`Multi-modal policy analysis completed using ${parsingResult.strategy}`);
      
      // Handle different possible response formats
      if (Array.isArray(parsingResult.data)) {
        // Convert array to object
        const resultObj: { [category: string]: PolicyCategoryAnalysis } = {};
        parsingResult.data.forEach((item: any) => {
          if (item.category) {
            const { category, ...rest } = item;
            resultObj[category] = rest;
          }
        });
        return resultObj;
      } else if (parsingResult.data.categories) {
        // Already in object format with categories wrapper
        return parsingResult.data.categories;
      } else if (typeof parsingResult.data === 'object' && parsingResult.data !== null) {
        // Direct object format - check if it has policy category keys
        const allCategoryKeys = getAllPolicyCategoryKeys();
        const hasPolicyKeys = allCategoryKeys.some(key => key in parsingResult.data);
        
        if (hasPolicyKeys) {
          // Direct object with policy categories
          return parsingResult.data;
        } else {
          // Unknown object format - try to extract categories or fallback
          console.warn('Unknown policy analysis response format, attempting fallback');
          // Use video context if transcript is empty
          const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
          return await performPolicyCategoryAnalysisBatched(fallbackText, model, contextAnalysis);
        }
      } else {
        console.warn('Unexpected policy analysis response format, attempting fallback');
        // Use video context if transcript is empty
        const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
        return await performPolicyCategoryAnalysisBatched(fallbackText, model, contextAnalysis);
      }
    } else {
      console.error(`Policy analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Policy analysis JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('Multi-modal policy analysis failed:', error);
    // Fallback to text-only policy analysis with video context
    const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
    return await performPolicyCategoryAnalysisBatched(fallbackText, model, contextAnalysis);
  }
}

/**
 * Multi-modal risk assessment
 */
async function performMultiModalRiskAssessment(
  videoData: VideoAnalysisData,
  model: SmartAIModel,
  contextAnalysis: ContextAnalysis,
  videoContext: string
): Promise<RiskAssessment> {
  const expectedSchema = {
    overall_risk_score: "number (0-100)",
    flagged_section: "string (most concerning part of the content)",
    risk_factors: ["list of main risk factors from visual and audio content"],
    severity_level: "string (LOW|MEDIUM|HIGH)",
    risky_phrases_by_category: "object (optional, categorized risky phrases)"
  };
  const exampleResponse = {
    overall_risk_score: 25,
    flagged_section: "Mild profanity detected in transcript",
    risk_factors: ["Mild profanity detected"],
    severity_level: "LOW",
    risky_phrases_by_category: {
      "ADVERTISER_FRIENDLY_PROFANITY": ["mild profanity"]
    }
  };
  const basePrompt = `Perform a comprehensive risk assessment of this YouTube video content (both visual and audio/transcript):`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}\n` +
    `${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}\n` +
    `Context: ${JSON.stringify(contextAnalysis)}\n` +
    `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateMultiModalContent!(
      robustPrompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      console.log(`Multi-modal risk assessment completed using ${parsingResult.strategy}`);
      // Validate against the proper schema
      const validationResult = RiskAssessmentSchema.safeParse(parsingResult.data);
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Risk assessment validation failed:', validationResult.error);
        throw new Error('Invalid risk assessment response structure');
      }
    } else {
      throw new Error(`Risk assessment JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('Multi-modal risk assessment failed:', error);
    // Fallback to text-only risk assessment with video context
    const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
    return await performRiskAssessment(fallbackText, model, contextAnalysis, contextAnalysis);
  }
}

/**
 * Multi-modal AI detection using multi-modal content
 */
async function performMultiModalAIDetection(
  videoData: VideoAnalysisData,
  model: SmartAIModel,
  channelContext: any,
  contextAnalysis: ContextAnalysis
): Promise<any> {
  console.log('Starting multi-modal AI detection...');
  console.log('Channel context available:', !!channelContext);
  console.log('Context analysis:', contextAnalysis);
  
  const expectedSchema = {
    ai_probability: "number (0-100)",
    confidence: "number (0-100)",
    patterns: ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected.'"],
    indicators: {
      repetitive_language: "number (0-100)",
      structured_content: "number (0-100)",
      personal_voice: "number (0-100)",
      grammar_consistency: "number (0-100)",
      natural_flow: "number (0-100)"
    },
    explanation: "string (detailed explanation of analysis)"
  };
  const exampleResponse = {
    ai_probability: 80,
    confidence: 90,
    patterns: ["Repetitive sentence structure", "Artificial generation artifacts"],
    indicators: {
      repetitive_language: 95,
      structured_content: 85,
      personal_voice: 70,
      grammar_consistency: 90,
      natural_flow: 80
    },
    explanation: "High probability of AI generation detected, particularly in sentence structure and artificial artifacts."
  };
  const basePrompt = `Analyze this video content for AI generation patterns and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `- Video: ${videoData.videoPath ? 'Available (visual content)' : 'Not available'}\n` +
    `- Transcript: ${videoData.transcript ? 'Available' : 'Not available'}\n` +
    `- Metadata: ${videoData.metadata ? JSON.stringify(videoData.metadata).substring(0, 200) + '...' : 'Not available'}\n` +
    `- Channel Context: ${channelContext ? 'Available' : 'Not available'}\n` +
    `- Context Analysis: ${JSON.stringify(contextAnalysis).substring(0, 200)}...\n\n` +
    `ANALYSIS REQUIREMENTS:\n` +
    `1. VISUAL ANALYSIS: Production quality, editing style, visual consistency, design elements, screen recording quality, human interaction patterns\n` +
    `2. CONTENT TYPE CONSIDERATIONS: Portfolio/Design work (typically human), Professional content (can be well-produced but still human), Educational content (often structured but authentically human)\n` +
    `3. AI PATTERN DETECTION: Only include actual AI generation patterns like repetitive visual patterns, artificial generation artifacts, machine learning outputs, synthetic characteristics\n` +
    `4. HUMAN INDICATORS: Do NOT include in patterns array - personal design style, original artwork, natural visual elements, professional brand design work, conceptual projects\n\n` +
    `CRITICAL: The "patterns" array should ONLY contain actual AI generation patterns. If no AI patterns are detected, use "No specific AI patterns detected." Do NOT include human content indicators in the patterns array.\n\n` +
    `CRITICAL: Output ONLY the JSON object above. Nothing else.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateMultiModalContent!(
      robustPrompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      console.log(`Multi-modal AI detection completed successfully using ${parsingResult.strategy}:`, parsingResult.data);
      return parsingResult.data;
    } else {
      console.error(`AI detection JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`AI detection JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('Multi-modal AI detection failed:', error);
    // Fallback to text-only AI detection
    if (videoData.transcript) {
      console.log('Falling back to transcript-based AI detection');
      return await performAIDetection(videoData.transcript, model, channelContext);
    }
    throw error;
  }
}

function getAllPolicyCategoryKeys() {
  // Flatten the nested YOUTUBE_POLICY_CATEGORIES object to get all keys
  return Object.entries(YOUTUBE_POLICY_CATEGORIES)
    .flatMap(([section, cats]) => Object.keys(cats).map(key => `${section}_${key}`));
}

/**
 * Enhanced JSON parsing with multiple fallback strategies
 */
function parseJSONWithFallbacks(response: string, expectedType: 'object' | 'array' = 'object'): any {
  console.log(`Attempting to parse JSON response (expected: ${expectedType})`);
  console.log('Response length:', response.length);
  console.log('Response preview:', response.substring(0, 200));
  
  let parsedResult: any = null;
  let jsonError = null;
  
  // Strategy 1: Direct JSON parsing
  try {
    parsedResult = JSON.parse(response);
    console.log('Direct JSON parsing succeeded');
    return parsedResult;
  } catch (e) {
    jsonError = e;
    console.log('Direct JSON parsing failed, trying extraction...');
  }
  
  // Strategy 2: Extract JSON from response
  const pattern = expectedType === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const jsonMatch = response.match(pattern);
  
  if (jsonMatch) {
    try {
      parsedResult = JSON.parse(jsonMatch[0]);
      console.log('JSON extraction succeeded');
      return parsedResult;
    } catch (e) {
      jsonError = e;
      console.log('JSON extraction failed, trying cleaning...');
    }
    
    // Strategy 3: Clean common JSON issues
    try {
      let cleaned = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*"/g, '"')
        .replace(/\\"/g, '"')
        .replace(/"/g, '\\"')
        .replace(/\\"/g, '"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      
      parsedResult = JSON.parse(cleaned);
      console.log('JSON cleaning succeeded');
      return parsedResult;
    } catch (e) {
      jsonError = e;
      console.log('JSON cleaning failed');
    }
  }
  
  console.log('All JSON parsing strategies failed');
  console.log('Final error:', jsonError);
  throw new Error(`Failed to parse JSON response: ${getErrorMessage(jsonError) || 'Unknown error'}`);
}

/**
 * AI-driven policy analysis using existing AI models
 */
async function performAIDrivenPolicyAnalysis(
  text: string,
  contextAnalysis: any,
  model: SmartAIModel,
  videoContext: string
): Promise<{ [category: string]: PolicyCategoryAnalysis }> {
  console.log('Performing AI-driven policy analysis...');
  const allCategoryKeys: string[] = getAllPolicyCategoryKeys();

  // Build expectedSchema as an object with all category keys
  const expectedSchema: any = { categories: {} };
  allCategoryKeys.forEach((key) => {
    expectedSchema.categories[key] = {
      risk_score: 'number (0-100)',
      confidence: 'number (0-100)',
      violations: ['array of specific violations found'],
      severity: 'LOW|MEDIUM|HIGH',
      explanation: 'detailed explanation of analysis',
    };
  });

  const exampleResponse = {
    categories: {
      CONTENT_SAFETY_VIOLENCE: {
        risk_score: 0,
        confidence: 90,
        violations: [],
        severity: 'LOW',
        explanation: 'No violent content detected in the analyzed text',
      },
      ADVERTISER_FRIENDLY_PROFANITY: {
        risk_score: 20,
        confidence: 70,
        violations: ['Mild profanity detected'],
        severity: 'LOW',
        explanation: 'Some mild profanity found but not severe enough for major policy violation',
      },
    },
  };
  const basePrompt = `Analyze this content for YouTube policy compliance and return ONLY this JSON structure with ALL ${allCategoryKeys.length} categories:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
      `CONTENT TO ANALYZE:\n` +
      `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n` +
      `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}\n\n` +
      `CONTEXT ANALYSIS:\n` +
      `${JSON.stringify(contextAnalysis)}\n\n` +
      `ANALYSIS GUIDELINES:\n` +
      `- Be conservative - only flag content that is genuinely problematic\n` +
      `- Consider the content type and context when assessing risk\n` +
      `- Common words like "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose" are NOT policy violations\n` +
      `- Family/child words like "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" are NOT policy violations\n` +
      `- Technology words like "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" are NOT policy violations\n` +
      `- Sports terminology and general discussion are NOT harmful content\n` +
      `- Only flag actual profanity, hate speech, threats, graphic violence, or sexual content\n` +
      `- If in doubt, err on the side of NOT flagging content\n` +
      `- You MUST return ALL ${allCategoryKeys.length} categories listed above, even if risk_score is 0\n` +
      `- Each category must have all required fields: risk_score, confidence, violations, severity, explanation\n\n` +
      `REQUIRED CATEGORIES (you must include ALL of these):\n` +
      `${allCategoryKeys.map((key, i) => `${i + 1}. ${key}`).join('\n    ')}\n\n` +
      `EXAMPLE RESPONSE STRUCTURE:\n` +
      `${JSON.stringify(exampleResponse, null, 2)}\n\n` +
      `FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Validate that all required categories are present
      const missingCategories = allCategoryKeys.filter((cat) => !parsingResult.data.categories?.[cat]);
      if (missingCategories.length > 0) {
        console.warn(`Missing categories in AI response: ${missingCategories.join(', ')}`);
        // Add missing categories with default values
        missingCategories.forEach((category) => {
          if (!parsingResult.data.categories) parsingResult.data.categories = {};
          parsingResult.data.categories[category] = {
            risk_score: 0,
            confidence: 0,
            violations: [],
            severity: 'LOW',
            explanation: 'Category not analyzed by AI - using default values',
          };
        });
      }
      // Convert to PolicyCategoryAnalysis object format
      const policyCategories: { [category: string]: PolicyCategoryAnalysis } = Object.entries(parsingResult.data.categories || {}).reduce((acc: { [category: string]: PolicyCategoryAnalysis }, [category, data]: [string, any]) => {
        acc[category] = {
          ...data,
      risk_score: Math.min(100, Math.max(0, data.risk_score || 0)),
      confidence: Math.min(100, Math.max(0, data.confidence || 0)),
      violations: Array.isArray(data.violations) ? data.violations : [],
      severity: data.severity || 'LOW',
          explanation: data.explanation || 'No explanation provided',
        };
        return acc;
      }, {});
      console.log(`AI-driven policy analysis completed with ${Object.keys(policyCategories).length} categories using ${parsingResult.strategy}`);
      return policyCategories;
    } else {
      console.error(`Policy analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Policy analysis JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI-driven policy analysis failed:', error);
    // Fallback to minimal analysis with all categories
    const fallbackCategories = getAllPolicyCategoryKeys();
    const fallbackObj: { [category: string]: PolicyCategoryAnalysis } = {};
    fallbackCategories.forEach((category: string) => {
      fallbackObj[category] = {
      risk_score: 0,
      confidence: 0,
      violations: [],
        severity: 'LOW' as const,
        explanation: 'Policy analysis unavailable - using fallback',
      };
    });
    return fallbackObj;
  }
}

/**
 * AI-driven risk assessment using existing AI models
 */
async function performAIDrivenRiskAssessment(
  text: string,
  contextAnalysis: any,
  model: SmartAIModel,
  videoContext: string
): Promise<any> {
  console.log('Performing AI-driven risk assessment...');
  const allCategoryKeys: string[] = getAllPolicyCategoryKeys();
  const expectedSchema: any = {
    overall_risk_score: 'number (0-100)',
    flagged_section: 'string (most concerning part of the content)',
    risk_factors: ['array of main risk factors'],
    severity_level: 'LOW|MEDIUM|HIGH',
    risky_phrases_by_category: {},
  };
  allCategoryKeys.forEach((key) => {
    expectedSchema.risky_phrases_by_category[key] = ['array of risky words/phrases found'];
  });
  const exampleResponse = {
    overall_risk_score: 25,
    flagged_section: 'Content contains some mild profanity',
    risk_factors: ['Mild profanity detected'],
    severity_level: 'LOW',
    risky_phrases_by_category: {
      ADVERTISER_FRIENDLY_PROFANITY: ['damn', 'hell'],
      COMMUNITY_STANDARDS_HATE_SPEECH: [],
      CONTENT_SAFETY_VIOLENCE: [],
    },
  };
  const basePrompt = `Assess the overall risk level and identify risky sections of this content:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
      `CONTENT TO ANALYZE:\n` +
      `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n` +
      `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}\n\n` +
      `CONTEXT ANALYSIS:\n` +
      `${JSON.stringify(contextAnalysis)}\n\n` +
      `RETURN ONLY this JSON structure:\n` +
      `${JSON.stringify(expectedSchema, null, 2)}\n\n` +
      `ANALYSIS GUIDELINES:\n` +
      `- Be conservative - only flag content that is genuinely problematic\n` +
      `- Consider the content type and context when assessing risk\n` +
      `- Common words like "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose" are NOT policy violations\n` +
      `- Family/child words like "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" are NOT policy violations\n` +
      `- Technology words like "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" are NOT policy violations\n` +
      `- Sports terminology and general discussion are NOT harmful content\n` +
      `- Only flag actual profanity, hate speech, threats, graphic violence, or sexual content\n` +
      `- If in doubt, err on the side of NOT flagging content\n` +
      `- For each policy category, include ONLY genuinely risky words/phrases that are the reason for the risk\n` +
      `- Look for ACTUAL WORDS from the content, not generic descriptions\n` +
      `- If no risky words/phrases found for a category, return an empty array for that category\n\n` +
      `CATEGORIES TO CHECK:\n` +
      `${allCategoryKeys.map((key, i) => `${i + 1}. ${key}`).join('\n    ')}\n\n` +
      `EXAMPLE RESPONSE:\n` +
      `${JSON.stringify(exampleResponse, null, 2)}\n\n` +
      `FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
    // Validate and normalize the result
    const validatedResult = {
        overall_risk_score: Math.min(100, Math.max(0, parsingResult.data.overall_risk_score || 0)),
        flagged_section: parsingResult.data.flagged_section || 'Content appears to be appropriate',
        risk_factors: Array.isArray(parsingResult.data.risk_factors) ? parsingResult.data.risk_factors : ['Minimal risk content'],
        severity_level: parsingResult.data.severity_level || 'LOW',
      risky_spans: [],
        risky_phrases_by_category: parsingResult.data.risky_phrases_by_category || {},
    };
    console.log(`AI-driven risk assessment completed using ${parsingResult.strategy}:`, validatedResult);
    return validatedResult;
    } else {
      console.error(`Risk assessment JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Risk assessment JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI-driven risk assessment failed:', error);
    // Fallback to minimal risk assessment
    const fallbackObj = {
      overall_risk_score: 0,
      flagged_section: 'Analysis unavailable',
      risk_factors: [],
      severity_level: 'LOW',
      risky_spans: [],
      risky_phrases_by_category: allCategoryKeys.reduce((acc: any, key: string) => {
        acc[key] = [];
        return acc;
      }, {}),
    };
    return fallbackObj;
  }
}

/**
 * AI-driven confidence analysis using existing AI models
 */
async function performConfidenceAnalysisWithContext(
  text: string, model: SmartAIModel, policyAnalysis: PolicyCategoryAnalysis[], contextAnalysis: ContextAnalysis, videoContext: string
): Promise<ConfidenceAnalysis> {
  console.log('Performing AI-driven confidence analysis...');
  
  const expectedSchema = {
    overall_confidence: "number (0-100)",
    text_clarity: "number (0-100)",
    policy_specificity: "number (0-100)",
    context_availability: "number (0-100)",
    confidence_factors: ["array of factors contributing to confidence"]
  };
  const exampleResponse = {
    overall_confidence: 75,
    text_clarity: 80,
    policy_specificity: 85,
    context_availability: 90,
    confidence_factors: ["Clear content analysis", "Moderate risk factors identified"]
  };
  const basePrompt = `Analyze the overall confidence of this content's adherence to YouTube policies and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n` +
    `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}\n\n` +
    `CONTEXT ANALYSIS:\n` +
    `${JSON.stringify(contextAnalysis)}\n\n` +
    `POLICY ANALYSIS:\n` +
    `${JSON.stringify(policyAnalysis)}\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- Overall Confidence: Assess the overall likelihood of the content being compliant.\n` +
    `- Confidence Level: Determine the severity of the risk (LOW, MEDIUM, HIGH, CRITICAL).\n` +
    `- Primary Confidence Factors: List the key factors that contribute to the confidence score.\n` +
    `- Policy Violations Confidence: Score the confidence in identifying policy violations.\n` +
    `- Risk Factors Confidence: Score the confidence in identifying risk factors.\n` +
    `- Brand Safety Confidence: Score the confidence in identifying brand safety concerns.\n\n` +
    `EXAMPLE RESPONSE:\n` +
    `${JSON.stringify(exampleResponse, null, 2)}\n\n` +
    `FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<ConfidenceAnalysis>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
    // Validate and normalize the result
      const validatedResult: ConfidenceAnalysis = {
        overall_confidence: Math.min(100, Math.max(0, parsingResult.data.overall_confidence || 0)),
        text_clarity: Math.min(100, Math.max(0, parsingResult.data.text_clarity || 0)),
        policy_specificity: Math.min(100, Math.max(0, parsingResult.data.policy_specificity || 0)),
        context_availability: Math.min(100, Math.max(0, parsingResult.data.context_availability || 0)),
        confidence_factors: Array.isArray(parsingResult.data.confidence_factors) ? parsingResult.data.confidence_factors : ['Analysis unavailable']
    };

    console.log(`AI-driven confidence analysis completed using ${parsingResult.strategy}:`, validatedResult);
    return validatedResult;
    } else {
      console.error(`Confidence analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Confidence analysis JSON parsing failed: ${parsingResult.error}`);
    }

  } catch (error) {
    console.error('AI-driven confidence analysis failed:', getErrorMessage(error));
    
    // Fallback to default confidence analysis
    return {
      overall_confidence: 0,
      text_clarity: 0,
      policy_specificity: 0,
      context_availability: 0,
      confidence_factors: ['Analysis unavailable']
    };
  }
  // Add fallback return to satisfy TS
  return {
    overall_confidence: 0,
    text_clarity: 0,
    policy_specificity: 0,
    context_availability: 0,
    confidence_factors: ['Analysis unavailable']
  };
}

/**
 * AI-driven suggestions using existing AI models
 */
async function generateActionableSuggestionsWithContext(text: string, model: SmartAIModel, policyAnalysis: PolicyCategoryAnalysis[], riskAssessment: RiskAssessment, videoContext: string): Promise<Suggestion[]> {
  console.log('Generating AI-driven suggestions...');
  
  const expectedSchema = {
    title: "string (specific action to take)",
    text: "string (detailed explanation of the suggestion)",
    priority: "HIGH|MEDIUM|LOW",
    impact_score: "number (0-100)"
  };
  const exampleResponse = {
    title: "Remove Profanity",
    text: "Consider removing or replacing profane language to improve advertiser-friendliness and reach a broader audience.",
    priority: "HIGH",
    impact_score: 85
  };
  const basePrompt = `Generate actionable suggestions for improving this YouTube video content based on policy violations and risk factors:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `${text ? `Content: "${text.substring(0, 1500)}${text.length > 1500 ? '...' : ''}"` : 'No content available'}\n` +
    `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}\n\n` +
    `Policy Analysis:\n` +
    `${JSON.stringify(policyAnalysis)}\n\n` +
    `Risk Assessment:\n` +
    `${JSON.stringify(riskAssessment)}\n\n` +
    `Generate 5-12 specific, actionable suggestions. Each suggestion must have:\n` +
    `- A clear, actionable title\n` +
    `- Detailed explanation text\n` +
    `- Priority level (HIGH/MEDIUM/LOW)\n` +
    `- Impact score (0-100)\n\n` +
    `Return ONLY this JSON array format:\n` +
    `${JSON.stringify(expectedSchema, null, 2)}\n\n` +
    `EXAMPLE SUGGESTIONS:\n` +
    `${JSON.stringify(exampleResponse, null, 2)}\n\n` +
    `SUGGESTION GUIDELINES:\n` +
    `- Focus on specific, implementable changes\n` +
    `- Address the highest risk categories first\n` +
    `- Provide clear, actionable advice\n` +
    `- Consider content type and audience\n` +
    `- If content is safe, suggest growth/monetization tips\n` +
    `- Each suggestion should be distinct and valuable\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON array. Do not include any commentary, explanation, or text outside the JSON array.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<Suggestion[]>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Validate and normalize the suggestions
      const suggestions: Suggestion[] = parsingResult.data.map((s: any, index: number) => {
        // Ensure we have meaningful text
        let suggestionText = s.text || s.description || s.explanation || '';
        if (!suggestionText || suggestionText === 'No suggestion text provided') {
          // Generate a fallback suggestion based on the title or index
          if (s.title && s.title !== `Suggestion ${index + 1}`) {
            suggestionText = `Consider implementing the suggestion: ${s.title}. This would help improve content compliance and audience reach.`;
          } else {
            suggestionText = `Review your content for potential policy violations and consider making adjustments to improve compliance.`;
          }
        }
        
        return {
          title: s.title || `Suggestion ${index + 1}`,
          text: suggestionText,
          priority: s.priority || 'MEDIUM',
          impact_score: Math.min(100, Math.max(0, s.impact_score || 50))
        };
      });

      console.log(`AI-driven suggestions completed with ${suggestions.length} suggestions using ${parsingResult.strategy}`);
      return suggestions;
    } else {
      console.error(`Suggestions JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Suggestions JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI-driven suggestions failed:', error);
    
    // Fallback to meaningful suggestions based on analysis
    const fallbackSuggestions: Suggestion[] = [];
    
    // Add suggestions based on policy analysis
    const policyArray = Object.entries(policyAnalysis || {}).map(([category, data]) => ({ ...data, category }));
    const highRiskCategories = policyArray.filter(p => p.risk_score > 50);
    if (highRiskCategories.length > 0) {
      fallbackSuggestions.push({
        title: 'Address High-Risk Content',
        text: `Review and modify content related to ${highRiskCategories[0].category.toLowerCase().replace(/_/g, ' ')} to reduce policy violation risk.`,
        priority: 'HIGH',
        impact_score: 80
      });
    }
    
    // Add general suggestions
    fallbackSuggestions.push({
      title: 'Review Content Guidelines',
      text: 'Familiarize yourself with YouTube\'s Community Guidelines and advertiser-friendly content policies to ensure compliance.',
      priority: 'MEDIUM',
      impact_score: 60
    });
    
    fallbackSuggestions.push({
      title: 'Consider Content Context',
      text: 'Ensure your content provides appropriate context and educational value when discussing sensitive topics.',
      priority: 'MEDIUM',
      impact_score: 50
    });
    
    // Add more fallback suggestions to reach minimum of 5
    fallbackSuggestions.push({
      title: 'Optimize for Engagement',
      text: 'Consider adding interactive elements, calls-to-action, or engaging visuals to improve viewer retention and engagement.',
      priority: 'MEDIUM',
      impact_score: 45
    });
    
    fallbackSuggestions.push({
      title: 'Improve Content Quality',
      text: 'Focus on improving audio quality, visual presentation, and overall production value to enhance viewer experience.',
      priority: 'MEDIUM',
      impact_score: 40
    });
    
    fallbackSuggestions.push({
      title: 'Enhance Monetization',
      text: 'Consider adding sponsor segments, affiliate links, or other monetization strategies that align with your content.',
      priority: 'LOW',
      impact_score: 35
    });
    
    return fallbackSuggestions;
  }
}

/**
 * Parse plain text response to structured context analysis
 */
async function performAIDrivenContextAnalysis(text: string, model: SmartAIModel): Promise<any> {
  console.log('Performing AI-driven context analysis...');
  
  const expectedSchema = {
    content_type: "string (Educational|Entertainment|Gaming|Music|Tutorial|Review|Vlog|Other)",
    target_audience: "string (General Audience|Teens|Children|Professional|Educational|Other)",
    monetization_impact: "number (0-100)",
    content_length: "number (word count)",
    language_detected: "string (English|Spanish|French|German|Other)",
    content_quality: "string (high|medium|low)",
    engagement_level: "string (high|medium|low)",
    visual_elements: ["array of visual elements detected"],
    audio_quality: "string (high|medium|low)",
    production_value: "string (high|medium|low)",
    content_complexity: "string (simple|moderate|complex)",
    brand_safety_concerns: ["array of brand safety concerns"],
    monetization_potential: "string (high|medium|low)"
  };
  const exampleResponse = {
    content_type: "Vlog",
    target_audience: "General Audience",
    monetization_impact: 70,
    content_length: 5000,
    language_detected: "English",
    content_quality: "medium",
    engagement_level: "high",
    visual_elements: ["gradient overlay", "enhanced colors"],
    audio_quality: "medium",
    production_value: "low",
    content_complexity: "moderate",
    brand_safety_concerns: ["drug use", "illegal activities"],
    monetization_potential: "medium"
  };
  const basePrompt = `Analyze this content and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- Content Type: Determine the primary genre/category of the content\n` +
    `- Target Audience: Identify the intended demographic\n` +
    `- Monetization Impact: Score 0-100 based on advertiser-friendliness and revenue potential\n` +
    `- Content Quality: Assess production value and polish\n` +
    `- Engagement Level: Estimate viewer engagement potential\n` +
    `- Visual Elements: Identify visual components mentioned or implied\n` +
    `- Audio Quality: Assess audio production value\n` +
    `- Production Value: Overall production quality assessment\n` +
    `- Content Complexity: Evaluate sophistication and depth\n` +
    `- Brand Safety: Identify potential brand safety concerns\n` +
    `- Monetization Potential: Estimate revenue generation capability\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
    // Validate and normalize the result
    const validatedResult = {
        content_type: parsingResult.data.content_type || 'Other',
        target_audience: parsingResult.data.target_audience || 'General Audience',
        monetization_impact: Math.min(100, Math.max(0, parsingResult.data.monetization_impact || 50)),
        content_length: parsingResult.data.content_length || text.split(' ').length,
        language_detected: parsingResult.data.language_detected || 'English',
        content_quality: parsingResult.data.content_quality || 'medium',
        engagement_level: parsingResult.data.engagement_level || 'medium',
        visual_elements: Array.isArray(parsingResult.data.visual_elements) ? parsingResult.data.visual_elements : [],
        audio_quality: parsingResult.data.audio_quality || 'medium',
        production_value: parsingResult.data.production_value || 'medium',
        content_complexity: parsingResult.data.content_complexity || 'moderate',
        brand_safety_concerns: Array.isArray(parsingResult.data.brand_safety_concerns) ? parsingResult.data.brand_safety_concerns : [],
        monetization_potential: parsingResult.data.monetization_potential || 'medium'
    };

    console.log(`AI-driven context analysis completed using ${parsingResult.strategy}:`, validatedResult);
    return validatedResult;
    } else {
      console.error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
    }

  } catch (error) {
    console.error('AI-driven context analysis failed:', error);
    
    // Fallback to default context analysis
    return {
      content_type: 'Other',
      target_audience: 'General Audience',
      monetization_impact: 50,
      content_length: text.split(' ').length,
      language_detected: 'English',
      content_quality: 'medium',
      engagement_level: 'medium',
      visual_elements: [],
      audio_quality: 'medium',
      production_value: 'medium',
      content_complexity: 'moderate',
      brand_safety_concerns: [],
      monetization_potential: 'medium'
    };
  }
}

/**
 * AI-driven AI detection using existing AI models
 */
async function performAIDrivenAIDetection(text: string, model: SmartAIModel): Promise<any> {
  console.log('Performing AI-driven AI detection...');
  
  const expectedSchema = {
    ai_probability: "number (0-100)",
    confidence: "number (0-100)",
    patterns: ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected.'"],
    indicators: {
      repetitive_language: "number (0-100)",
      structured_content: "number (0-100)",
      personal_voice: "number (0-100)",
      grammar_consistency: "number (0-100)",
      natural_flow: "number (0-100)"
    },
    explanation: "string (detailed explanation of analysis)"
  };
  const exampleResponse = {
    ai_probability: 80,
    confidence: 90,
    patterns: ["Repetitive sentence structure", "Artificial generation artifacts"],
    indicators: {
      repetitive_language: 95,
      structured_content: 85,
      personal_voice: 70,
      grammar_consistency: 90,
      natural_flow: 80
    },
    explanation: "High probability of AI generation detected, particularly in sentence structure and artificial artifacts."
  };
  const basePrompt = `Analyze this content for AI generation patterns and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- Be VERY conservative in AI detection - only flag content with CLEAR, OBVIOUS AI generation patterns\n` +
    `- Consider content type and context when assessing AI probability\n` +
    `- Structured content (tutorials, educational) is normal and doesn't indicate AI generation\n` +
    `- Professional content can be well-produced but still human-created\n` +
    `- Personal elements strongly indicate human content\n` +
    `- Visual elements and screen recordings indicate human interaction\n` +
    `- Brand references in design work are normal for human designers\n` +
    `- Gaming content can have structure but is often human-created\n` +
    `- Conceptual content (alcohol-related design work) is typical of human designers\n\n` +
    `ONLY flag as AI-generated if you detect MULTIPLE of these CLEAR indicators:\n` +
    `1. Unnaturally perfect grammar with ZERO errors in casual speech\n` +
    `2. Complete absence of personal pronouns (I, me, my, we, our) in personal content\n` +
    `3. Overly formal academic tone in casual/entertainment content\n` +
    `4. Exact repetitive sentence structures (not just similar topics)\n` +
    `5. Complete lack of current slang, cultural references, or timely mentions\n` +
    `6. Unnatural topic transitions that don't follow human thought patterns\n` +
    `7. Perfect spelling with no typos in conversational content\n` +
    `8. Template-like structure that's too rigid for human storytelling\n\n` +
    `DO NOT flag for:\n` +
    `- Structured narratives (normal for storytelling)\n` +
    `- Repetitive terminology (normal for specialized content)\n` +
    `- Consistent grammar (normal for professional content)\n` +
    `- Template intros/outros (standard YouTube format)\n` +
    `- Personal anecdotes (indicates human content)\n` +
    `- Natural speech patterns with minor errors\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
    // Validate and normalize the result
    const validatedResult = {
        ai_probability: Math.min(100, Math.max(0, parsingResult.data.ai_probability || 0)),
        confidence: Math.min(100, Math.max(0, parsingResult.data.confidence || 0)),
        patterns: Array.isArray(parsingResult.data.patterns) ? parsingResult.data.patterns : ['No specific AI patterns detected.'],
      indicators: {
          repetitive_language: Math.min(100, Math.max(0, parsingResult.data.indicators?.repetitive_language || 0)),
          structured_content: Math.min(100, Math.max(0, parsingResult.data.indicators?.structured_content || 0)),
          personal_voice: Math.min(100, Math.max(0, parsingResult.data.indicators?.personal_voice || 0)),
          grammar_consistency: Math.min(100, Math.max(0, parsingResult.data.indicators?.grammar_consistency || 0)),
          natural_flow: Math.min(100, Math.max(0, parsingResult.data.indicators?.natural_flow || 0))
        },
        explanation: parsingResult.data.explanation || 'AI detection analysis completed'
    };

    console.log(`AI-driven AI detection completed using ${parsingResult.strategy}:`, validatedResult);
    return validatedResult;
    } else {
      console.error(`AI detection JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`AI detection JSON parsing failed: ${parsingResult.error}`);
    }

  } catch (error) {
    console.error('AI-driven AI detection failed:', error);
    
    // Fallback to minimal AI detection
    return {
      ai_probability: 0,
      confidence: 0,
      patterns: ['No specific AI patterns detected.'],
      indicators: {
        repetitive_language: 0,
        structured_content: 0,
        personal_voice: 0,
        grammar_consistency: 0,
        natural_flow: 0
      },
      explanation: 'AI detection analysis failed - defaulting to 0%'
    };
  }
}

/**
 * AI detection with video context from Gemini
 */
async function performAIDetectionWithContext(
  transcript: string, 
  model: SmartAIModel, 
  channelContext: any, 
  videoContext: string
): Promise<any> {
  console.log('Performing AI detection with video context...');
  
  const expectedSchema = {
    ai_probability: "number (0-100)",
    confidence: "number (0-100)",
    patterns: ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected'"],
    indicators: ["array of indicators that suggest AI generation"],
    explanation: "string explaining the analysis"
  };
  const exampleResponse = {
    ai_probability: 80,
    confidence: 90,
    patterns: ["Repetitive sentence structure", "Artificial generation artifacts"],
    indicators: ["Repetitive sentence structure", "Artificial generation artifacts"],
    explanation: "High probability of AI generation detected, particularly in sentence structure and artificial artifacts."
  };
  const basePrompt = `Analyze this content for AI generation patterns and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${transcript.substring(0, 2000)}${transcript.length > 2000 ? '...' : ''}"\n\n` +
    `VIDEO CONTEXT (from Gemini visual analysis):\n` +
    `${videoContext}\n\n` +
    `CHANNEL CONTEXT:\n` +
    `${JSON.stringify(channelContext)}\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- AI Probability: Likelihood that this content was AI-generated (0-100)\n` +
    `- Confidence: Confidence in the AI detection assessment (0-100)\n` +
    `- Patterns: Specific patterns that indicate AI generation\n` +
    `- Indicators: General indicators that suggest AI involvement\n` +
    `- Explanation: Clear explanation of the assessment\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  try {
    const result = await model.performTextAnalysisWithContext(
      robustPrompt,
      videoContext,
      transcript,
      channelContext
    );
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
    // Validate and normalize the result
    const validatedResult = {
        ai_probability: Math.min(100, Math.max(0, parsingResult.data.ai_probability || 0)),
        confidence: Math.min(100, Math.max(0, parsingResult.data.confidence || 0)),
        patterns: Array.isArray(parsingResult.data.patterns) ? parsingResult.data.patterns : ['No specific AI patterns detected'],
        indicators: Array.isArray(parsingResult.data.indicators) ? parsingResult.data.indicators : ['No specific indicators detected'],
        explanation: parsingResult.data.explanation || 'AI detection analysis completed'
    };

    console.log(`AI detection with context completed using ${parsingResult.strategy}:`, validatedResult);
    return validatedResult;
    } else {
      console.error(`AI detection with context JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`AI detection with context JSON parsing failed: ${parsingResult.error}`);
    }

  } catch (error) {
    console.error('AI detection with context failed:', error);
    
    // Fallback to basic AI detection
    return {
      ai_probability: 0,
      confidence: 0,
      patterns: ['Analysis unavailable'],
      indicators: ['Analysis unavailable'],
      explanation: 'AI detection analysis failed'
    };
  }
}

/**
 * Fallback to text-only analysis
 */
async function performTextOnlyAnalysis(videoData: VideoAnalysisData, channelContext?: any): Promise<EnhancedAnalysisResult> {
  console.log('Performing text-only analysis as fallback');
  
  const contentToAnalyze = videoData.transcript || 
    (videoData.metadata ? `Title: ${videoData.metadata.title}\n\nDescription:\n${videoData.metadata.description}` : 'Video content analysis');
  
  // Import and use the existing enhanced analysis
  const { performEnhancedAnalysis } = await import('./ai-analysis');
  return await performEnhancedAnalysis(contentToAnalyze, channelContext);
} 

/**
 * Fix error property access for error.message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') return (error as any).message;
  return String(error);
} 
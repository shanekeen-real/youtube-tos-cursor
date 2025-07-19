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
import { VideoAnalysisData } from '@/types/video-processing';

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
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON

    Analyze this video content and return ONLY this JSON structure:
    {
      "content_type": "string (Educational|Entertainment|Gaming|Music|Tutorial|Review|Vlog|Other)",
      "target_audience": "string (General Audience|Teens|Children|Professional|Educational|Other)",
      "monetization_impact": number (0-100),
      "content_length": number (word count),
      "language_detected": "string (English|Spanish|French|German|Other)",
      "content_quality": "string (high|medium|low)",
      "engagement_level": "string (high|medium|low)",
      "visual_elements": ["array of visual elements detected"],
      "audio_quality": "string (high|medium|low)",
      "production_value": "string (high|medium|low)",
      "content_complexity": "string (simple|moderate|complex)",
      "brand_safety_concerns": ["array of brand safety concerns"],
      "monetization_potential": "string (high|medium|low)"
    }

    Video Content: ${videoData.videoPath ? 'Video file available for analysis' : 'No video file'}
    ${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}
    ${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text.
  `;

  try {
    const result = await model.generateMultiModalContent!(
      prompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    
    console.log('Raw Gemini response (first 1000 chars):', result.substring(0, 1000));
    console.log('Raw Gemini response length:', result.length);
    console.log('Last 500 chars:', result.substring(Math.max(0, result.length - 500)));
    
    // Try to parse as JSON first
    try {
      const parsedResult = parseJSONSafely(result) as any;
      const validationResult = ContextAnalysisSchema.safeParse(parsedResult);
      
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Context analysis validation failed:', validationResult.error);
        console.error('Parsed result:', JSON.stringify(parsedResult, null, 2));
        throw new Error('Invalid context analysis response');
      }
    } catch (jsonError) {
      console.log('JSON parsing failed, attempting to parse plain text response...');
      
      // Fallback: Parse plain text response and convert to structured format
      const structuredResult = await performAIDrivenContextAnalysis(result, model);
      const validationResult = ContextAnalysisSchema.safeParse(structuredResult);
      
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Plain text parsing validation failed:', validationResult.error);
        throw new Error('Invalid context analysis response');
      }
    }
  } catch (error) {
    console.error('Multi-modal context analysis failed:', error);
    // Fallback to text-only context analysis
    if (videoData.transcript) {
      return await performContextAnalysis(videoData.transcript, model);
    }
    throw error;
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
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with [ and end with ]
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON
    - If you cannot provide a value, use null or empty string
    - All numbers must be actual numbers, not strings

    Analyze this YouTube video content (both visual and audio/transcript) for policy violations across all categories:

    ${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}
    ${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}
    Context: ${JSON.stringify(contextAnalysis)}
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    Analyze each policy category and return results in JSON format:
    [
      {
        "category": "string (policy category name)",
        "risk_level": "string (low|medium|high|critical)",
        "confidence": number (0-100),
        "description": "string (detailed analysis of visual and audio content)",
        "visual_evidence": ["list of visual elements that support this assessment"],
        "audio_evidence": ["list of audio/transcript elements that support this assessment"],
        "recommendations": ["list of specific recommendations for this category"]
      }
    ]

    EXAMPLE RESPONSE:
    [
      {
        "category": "Violence",
        "risk_level": "low",
        "confidence": 85,
        "description": "No violent content detected in visual or audio elements",
        "visual_evidence": ["No violent imagery present"],
        "audio_evidence": ["No violent language in transcript"],
        "recommendations": ["Continue to avoid violent content"]
      }
    ]

    FINAL WARNING: Output ONLY the JSON array above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.
  `;

  try {
    const result = await model.generateMultiModalContent!(
      prompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    
    // Try to parse as JSON first with enhanced error handling
    let parsedResult: any = null;
    let jsonError = null;
    
    try {
      parsedResult = parseJSONSafely(result) as any;
    } catch (e) {
      jsonError = e;
      console.log('Initial JSON parsing failed, attempting enhanced parsing...');
      
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]) as any;
        } catch (e2) {
          console.log('Enhanced JSON extraction failed, attempting AI-driven analysis...');
          jsonError = e2;
        }
      }
    }
    
    if (parsedResult && Array.isArray(parsedResult)) {
      // Validate each policy analysis
      const validatedResults: PolicyCategoryAnalysis[] = [];
      for (const analysis of parsedResult as any[]) {
        const validationResult = PolicyCategoryAnalysisSchema.safeParse(analysis);
        if (validationResult.success) {
          validatedResults.push(validationResult.data);
        } else {
          console.warn('Invalid policy analysis result:', validationResult.error);
        }
      }
      
      if (validatedResults.length > 0) {
        // Convert array to object
        const resultObj: { [category: string]: PolicyCategoryAnalysis } = {};
        (validatedResults as any[]).forEach((item: any) => {
          if (item.category) {
            const { category, ...rest } = item;
            resultObj[category] = rest;
          }
        });
        return resultObj;
      }
    }
    
    // If we get here, JSON parsing or validation failed
    console.log('JSON parsing/validation failed for policy analysis, attempting AI-driven analysis...');
    console.log('Raw response length:', result.length);
    console.log('Raw response preview:', result.substring(0, 200));
    
    // Fallback: Use AI-driven policy analysis instead of hardcoded patterns
    const contentToAnalyze = videoData.transcript || 
      (videoData.metadata ? `Title: ${videoData.metadata.title}\n\nDescription:\n${videoData.metadata.description}` : 'Video content analysis');
    
    return await performAIDrivenPolicyAnalysis(contentToAnalyze, contextAnalysis, model, videoContext);
  } catch (error) {
    console.error('Multi-modal policy analysis failed:', error);
    // Fallback to text-only policy analysis
    if (videoData.transcript) {
      return await performPolicyCategoryAnalysisBatched(videoData.transcript, model, contextAnalysis);
    }
    throw error;
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
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON
    - If you cannot provide a value, use null or empty string
    - All numbers must be actual numbers, not strings

    Perform a comprehensive risk assessment of this YouTube video content (both visual and audio/transcript):

    ${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}
    ${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}
    Context: ${JSON.stringify(contextAnalysis)}
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    Return risk assessment in JSON format:
    {
      "overall_risk_score": number (0-100),
      "risk_level": "string (LOW|MEDIUM|HIGH|CRITICAL)",
      "primary_concerns": ["list of main risk factors from visual and audio content"],
      "compliance_status": "string (compliant|warning|violation)",
      "recommended_actions": ["list of specific actions to address risks"],
      "visual_risk_factors": ["list of visual elements that contribute to risk"],
      "audio_risk_factors": ["list of audio/transcript elements that contribute to risk"],
      "brand_safety_score": number (0-100, higher = safer for brands)
    }

    EXAMPLE RESPONSE:
    {
      "overall_risk_score": 25,
      "risk_level": "LOW",
      "primary_concerns": ["Mild profanity detected"],
      "compliance_status": "compliant",
      "recommended_actions": ["Consider removing profanity for better advertiser-friendliness"],
      "visual_risk_factors": ["No visual risks detected"],
      "audio_risk_factors": ["Some mild profanity in transcript"],
      "brand_safety_score": 75
    }

    FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.
  `;

  try {
    const result = await model.generateMultiModalContent!(
      prompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    
    // Try to parse as JSON first with enhanced error handling
    let parsedResult: any = null;
    let jsonError = null;
    
    try {
      parsedResult = parseJSONSafely(result) as any;
    } catch (e) {
      jsonError = e;
      console.log('Initial JSON parsing failed, attempting enhanced parsing...');
      
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResult = JSON.parse(jsonMatch[0]) as any;
        } catch (e2) {
          console.log('Enhanced JSON extraction failed, attempting AI-driven analysis...');
          jsonError = e2;
        }
      }
    }
    
    if (parsedResult && typeof parsedResult === 'object') {
      const validationResult = RiskAssessmentSchema.safeParse(parsedResult);
      
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Risk assessment validation failed:', validationResult.error);
        console.log('Invalid response structure:', parsedResult);
      }
    }
    
    // If we get here, JSON parsing or validation failed
    console.log('JSON parsing/validation failed for risk assessment, attempting AI-driven analysis...');
    console.log('Raw response length:', result.length);
    console.log('Raw response preview:', result.substring(0, 200));
    
    // Fallback: Use AI-driven risk assessment instead of hardcoded patterns
    const contentToAnalyze = videoData.transcript || 
      (videoData.metadata ? `Title: ${videoData.metadata.title}\n\nDescription:\n${videoData.metadata.description}` : 'Video content analysis');
    
    return await performAIDrivenRiskAssessment(contentToAnalyze, contextAnalysis, model, videoContext);
  } catch (error) {
    console.error('Multi-modal risk assessment failed:', error);
    // Fallback to text-only risk assessment
    if (videoData.transcript) {
      return await performRiskAssessment(videoData.transcript, model, contextAnalysis, contextAnalysis);
    }
    throw error;
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
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON

    Analyze this video content for AI generation patterns and return ONLY this JSON structure:
    {
      "ai_probability": number (0-100),
      "confidence": number (0-100),
      "patterns": ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected.'"],
      "indicators": {
        "repetitive_language": number (0-100),
        "structured_content": number (0-100),
        "personal_voice": number (0-100),
        "grammar_consistency": number (0-100),
        "natural_flow": number (0-100)
      },
      "explanation": "string (detailed explanation of analysis)"
    }

    CONTENT TO ANALYZE:
    - Video: ${videoData.videoPath ? 'Available (visual content)' : 'Not available'}
    - Transcript: ${videoData.transcript ? 'Available' : 'Not available'}
    - Metadata: ${videoData.metadata ? JSON.stringify(videoData.metadata).substring(0, 200) + '...' : 'Not available'}
    - Channel Context: ${channelContext ? 'Available' : 'Not available'}
    - Context Analysis: ${JSON.stringify(contextAnalysis).substring(0, 200)}...

    ANALYSIS REQUIREMENTS:
    1. VISUAL ANALYSIS: Production quality, editing style, visual consistency, design elements, screen recording quality, human interaction patterns
    2. CONTENT TYPE CONSIDERATIONS: Portfolio/Design work (typically human), Professional content (can be well-produced but still human), Educational content (often structured but authentically human)
    3. AI PATTERN DETECTION: Only include actual AI generation patterns like repetitive visual patterns, artificial generation artifacts, machine learning outputs, synthetic characteristics
    4. HUMAN INDICATORS: Do NOT include in patterns array - personal design style, original artwork, natural visual elements, professional brand design work, conceptual projects

    CRITICAL: The "patterns" array should ONLY contain actual AI generation patterns. If no AI patterns are detected, use "No specific AI patterns detected." Do NOT include human content indicators in the patterns array.

    CRITICAL: Output ONLY the JSON object above. Nothing else.
  `;

  try {
    const result = await model.generateMultiModalContent!(
      prompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    
    console.log('Raw Gemini response (first 1000 chars):', result.substring(0, 1000));
    console.log('Raw Gemini response length:', result.length);
    console.log('Last 500 chars:', result.substring(Math.max(0, result.length - 500)));
    
    // Try to parse as JSON first
    try {
      const parsedResult = parseJSONSafely(result) as any;
      const validationResult = z.object({
        ai_probability: z.number(),
        confidence: z.number(),
        patterns: z.array(z.string()),
        indicators: z.object({
          repetitive_language: z.number(),
          structured_content: z.number(),
          personal_voice: z.number(),
          grammar_consistency: z.number(),
          natural_flow: z.number()
        }),
        explanation: z.string()
      }).safeParse(parsedResult);
      
      if (validationResult.success) {
        console.log('Multi-modal AI detection completed successfully:', validationResult.data);
        return validationResult.data;
      } else {
        console.error('AI detection validation failed:', validationResult.error);
        console.error('Parsed result:', JSON.stringify(parsedResult, null, 2));
        throw new Error('Invalid AI detection response');
      }
    } catch (jsonError) {
      console.log('JSON parsing failed for AI detection, attempting AI-driven analysis...');
      
      // Fallback: Use AI-driven AI detection instead of hardcoded patterns
      const contentToAnalyze = videoData.transcript || 
        (videoData.metadata ? `Title: ${videoData.metadata.title}\n\nDescription:\n${videoData.metadata.description}` : 'Video content analysis');
      
      return await performAIDrivenAIDetection(contentToAnalyze, model);
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
async function performAIDrivenPolicyAnalysis(text: string, contextAnalysis: any, model: SmartAIModel, videoContext: string): Promise<{ [category: string]: PolicyCategoryAnalysis }> {
  console.log('Performing AI-driven policy analysis...');
  const allCategoryKeys = getAllPolicyCategoryKeys();

  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON
    - All numbers must be actual numbers, not strings
    - If you cannot provide a value, use null or empty string

    Analyze this content for YouTube policy compliance and return ONLY this JSON structure with ALL ${allCategoryKeys.length} categories:
    {
      "categories": {
        ${allCategoryKeys.map(key => `"${key}": { "risk_score": number (0-100), "confidence": number (0-100), "violations": ["array of specific violations found"], "severity": "LOW|MEDIUM|HIGH", "explanation": "detailed explanation of analysis" }`).join(',\n        ')}
      }
    }

    CONTENT TO ANALYZE:
    "${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    CONTEXT ANALYSIS:
    ${JSON.stringify(contextAnalysis)}

    ANALYSIS GUIDELINES:
    - Be conservative - only flag content that is genuinely problematic
    - Consider the content type and context when assessing risk
    - Common words like "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose" are NOT policy violations
    - Family/child words like "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" are NOT policy violations
    - Technology words like "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" are NOT policy violations
    - Sports terminology and general discussion are NOT harmful content
    - Only flag actual profanity, hate speech, threats, graphic violence, or sexual content
    - If in doubt, err on the side of NOT flagging content
    - You MUST return ALL ${allCategoryKeys.length} categories listed above, even if risk_score is 0
    - Each category must have all required fields: risk_score, confidence, violations, severity, explanation

    REQUIRED CATEGORIES (you must include ALL of these):
    ${allCategoryKeys.map((key, i) => `${i + 1}. ${key}`).join('\n    ')}

    EXAMPLE RESPONSE STRUCTURE:
    {
      "categories": {
        "CONTENT_SAFETY_VIOLENCE": {
          "risk_score": 0,
          "confidence": 90,
          "violations": [],
          "severity": "LOW",
          "explanation": "No violent content detected in the analyzed text"
        },
        "ADVERTISER_FRIENDLY_PROFANITY": {
          "risk_score": 20,
          "confidence": 70,
          "violations": ["Mild profanity detected"],
          "severity": "LOW",
          "explanation": "Some mild profanity found but not severe enough for major policy violation"
        }
      }
    }

    FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.
  `;

  try {
    const result = await model.generateContent(prompt);
    console.log('AI-driven policy analysis raw response length:', result.length);
    console.log('AI-driven policy analysis raw response preview:', result.substring(0, 200));
    
    let parsedResult: any = null;
    let jsonError = null;
    
    // Try multiple JSON extraction strategies
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        jsonError = e;
        console.log('Initial JSON parsing failed, attempting enhanced parsing...');
        
        // Try to fix common JSON issues
        let cleaned = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*"/g, '"')
          .replace(/\\"/g, '"')
          .replace(/"/g, '\\"')
          .replace(/\\"/g, '"');
        
        try {
          parsedResult = JSON.parse(cleaned);
        } catch (e2) {
          console.log('Enhanced JSON cleaning failed:', e2);
          jsonError = e2;
        }
      }
    } else {
      throw new Error('No JSON object found in AI response');
    }
    
    // Validate that all required categories are present
    const missingCategories = allCategoryKeys.filter(cat => !parsedResult.categories?.[cat]);
    if (missingCategories.length > 0) {
      console.warn(`Missing categories in AI response: ${missingCategories.join(', ')}`);
      // Add missing categories with default values
      missingCategories.forEach(category => {
        if (!parsedResult.categories) parsedResult.categories = {};
        parsedResult.categories[category] = {
          risk_score: 0,
          confidence: 0,
          violations: [],
          severity: 'LOW',
          explanation: 'Category not analyzed by AI - using default values'
        };
      });
    }
    
    // Convert to PolicyCategoryAnalysis array format
    const policyCategories: { [category: string]: PolicyCategoryAnalysis } = Object.entries(parsedResult.categories || {}).reduce((acc, [category, data]: [string, any]) => {
      acc[category] = {
        ...data,
        risk_score: Math.min(100, Math.max(0, data.risk_score || 0)),
        confidence: Math.min(100, Math.max(0, data.confidence || 0)),
        violations: Array.isArray(data.violations) ? data.violations : [],
        severity: data.severity || 'LOW',
        explanation: data.explanation || 'No explanation provided'
      };
      return acc;
    }, {} as { [category: string]: PolicyCategoryAnalysis });

    console.log(`AI-driven policy analysis completed with ${Object.keys(policyCategories).length} categories`);
    return policyCategories;

  } catch (error) {
    console.error('AI-driven policy analysis failed:', error);
    // Fallback to minimal analysis with all categories
    const fallbackCategories = getAllPolicyCategoryKeys();
    const fallbackObj: { [category: string]: PolicyCategoryAnalysis } = {};
    fallbackCategories.forEach(category => {
      fallbackObj[category] = {
        risk_score: 0,
        confidence: 0,
        violations: [],
        severity: 'LOW' as const,
        explanation: 'Policy analysis unavailable - using fallback'
      };
    });
    return fallbackObj;
  }
}

/**
 * AI-driven risk assessment using existing AI models
 */
async function performAIDrivenRiskAssessment(text: string, contextAnalysis: any, model: SmartAIModel, videoContext: string): Promise<any> {
  console.log('Performing AI-driven risk assessment...');
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON
    - All numbers must be actual numbers, not strings
    - If you cannot provide a value, use null or empty string

    Assess the overall risk level and identify risky sections of this content:

    CONTENT TO ANALYZE:
    "${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    CONTEXT ANALYSIS:
    ${JSON.stringify(contextAnalysis)}

    Return ONLY this JSON structure:
    {
      "overall_risk_score": number (0-100),
      "flagged_section": "string (most concerning part of the content)",
      "risk_factors": ["array of main risk factors"],
      "severity_level": "LOW|MEDIUM|HIGH",
      "risky_phrases_by_category": {
        "CATEGORY_KEY": ["array of risky words/phrases found"],
        ...
      }
    }

    ANALYSIS GUIDELINES:
    - Be conservative - only flag content that is genuinely problematic
    - Consider the content type and context when assessing risk
    - Common words like "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose" are NOT policy violations
    - Family/child words like "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" are NOT policy violations
    - Technology words like "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" are NOT policy violations
    - Sports terminology and general discussion are NOT harmful content
    - Only flag actual profanity, hate speech, threats, graphic violence, or sexual content
    - If in doubt, err on the side of NOT flagging content
    - For each policy category, include ONLY genuinely risky words/phrases that are the reason for the risk
    - Look for ACTUAL WORDS from the content, not generic descriptions
    - If no risky words/phrases found for a category, return an empty array for that category

    CATEGORIES TO CHECK:
    - COMMUNITY_STANDARDS_HATE_SPEECH
    - COMMUNITY_STANDARDS_HARASSMENT
    - COMMUNITY_STANDARDS_VIOLENCE
    - COMMUNITY_STANDARDS_MISINFORMATION
    - ADVERTISER_FRIENDLY_PROFANITY
    - ADVERTISER_FRIENDLY_CONTROVERSIAL
    - ADVERTISER_FRIENDLY_BRAND_SAFETY
    - CONTENT_SAFETY_VIOLENCE
    - CONTENT_SAFETY_SEXUAL
    - COPYRIGHT_INFRINGEMENT

    EXAMPLE RESPONSE:
    {
      "overall_risk_score": 25,
      "flagged_section": "Content contains some mild profanity",
      "risk_factors": ["Mild profanity detected"],
      "severity_level": "LOW",
      "risky_phrases_by_category": {
        "ADVERTISER_FRIENDLY_PROFANITY": ["damn", "hell"],
        "COMMUNITY_STANDARDS_HATE_SPEECH": [],
        "CONTENT_SAFETY_VIOLENCE": []
      }
    }

    FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.
  `;

  try {
    const result = await model.generateContent(prompt);
    console.log('AI-driven risk assessment raw response length:', result.length);
    console.log('AI-driven risk assessment raw response preview:', result.substring(0, 200));
    
    let parsedResult: any = null;
    let jsonError = null;
    
    // Try multiple JSON extraction strategies
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        jsonError = e;
        console.log('Initial JSON parsing failed, attempting enhanced parsing...');
        
        // Try to fix common JSON issues
        let cleaned = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*"/g, '"')
          .replace(/\\"/g, '"')
          .replace(/"/g, '\\"')
          .replace(/\\"/g, '"');
        
        try {
          parsedResult = JSON.parse(cleaned);
        } catch (e2) {
          console.log('Enhanced JSON cleaning failed:', e2);
          jsonError = e2;
        }
      }
    } else {
      throw new Error('No JSON object found in AI response');
    }
    
    if (parsedResult) {
      // Validate and normalize the result
      const validatedResult = {
        overall_risk_score: Math.min(100, Math.max(0, parsedResult.overall_risk_score || 0)),
        flagged_section: parsedResult.flagged_section || 'Content appears to be appropriate',
        risk_factors: Array.isArray(parsedResult.risk_factors) ? parsedResult.risk_factors : ['Minimal risk content'],
        severity_level: parsedResult.severity_level || 'LOW',
        risky_spans: [],
        risky_phrases_by_category: parsedResult.risky_phrases_by_category || {}
      };

      console.log('AI-driven risk assessment completed:', validatedResult);
      return validatedResult;
    }

  } catch (error) {
    console.error('AI-driven risk assessment failed:', error);
    
    // Fallback to minimal risk assessment
    return {
      overall_risk_score: 0,
      flagged_section: 'Content analysis unavailable',
      risk_factors: ['Analysis unavailable'],
      severity_level: 'LOW',
      risky_spans: [],
      risky_phrases_by_category: {}
    };
  }
}

/**
 * AI-driven confidence analysis using existing AI models
 */
async function performConfidenceAnalysisWithContext(
  text: string, model: SmartAIModel, policyAnalysis: PolicyCategoryAnalysis[], contextAnalysis: ContextAnalysis, videoContext: string
): Promise<ConfidenceAnalysis> {
  console.log('Performing AI-driven confidence analysis...');
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON
    - All numbers must be actual numbers, not strings
    - If you cannot provide a value, use null or empty string

    Analyze the overall confidence of this content's adherence to YouTube policies and return ONLY this JSON structure:
    {
      "overall_confidence": number (0-100),
      "confidence_level": "string (LOW|MEDIUM|HIGH|CRITICAL)",
      "primary_confidence_factors": ["array of factors contributing to confidence"],
      "policy_violations_confidence": number (0-100),
      "risk_factors_confidence": number (0-100),
      "brand_safety_confidence": number (0-100)
    }

    CONTENT TO ANALYZE:
    "${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    CONTEXT ANALYSIS:
    ${JSON.stringify(contextAnalysis)}

    POLICY ANALYSIS:
    ${JSON.stringify(policyAnalysis)}

    ANALYSIS GUIDELINES:
    - Overall Confidence: Assess the overall likelihood of the content being compliant.
    - Confidence Level: Determine the severity of the risk (LOW, MEDIUM, HIGH, CRITICAL).
    - Primary Confidence Factors: List the key factors that contribute to the confidence score.
    - Policy Violations Confidence: Score the confidence in identifying policy violations.
    - Risk Factors Confidence: Score the confidence in identifying risk factors.
    - Brand Safety Confidence: Score the confidence in identifying brand safety concerns.

    EXAMPLE RESPONSE:
    {
      "overall_confidence": 75,
      "confidence_level": "MEDIUM",
      "primary_confidence_factors": ["Clear content analysis", "Moderate risk factors identified"],
      "policy_violations_confidence": 80,
      "risk_factors_confidence": 70,
      "brand_safety_confidence": 75
    }

    FINAL WARNING: Output ONLY the JSON object above. Nothing else. No explanations, no commentary, no additional text. Do not include any narrative or descriptive text outside the JSON structure.
  `;

  try {
    const result = await model.generateContent(prompt);
    console.log('AI-driven confidence analysis raw response length:', result.length);
    console.log('AI-driven confidence analysis raw response preview:', result.substring(0, 200));
    
    let parsedResult: any = null;
    let jsonError = null;
    
    // Try multiple JSON extraction strategies
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        jsonError = e;
        console.log('Initial JSON parsing failed, attempting enhanced parsing...');
        
        // Try to fix common JSON issues
        let cleaned = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*"/g, '"')
          .replace(/\\"/g, '"')
          .replace(/"/g, '\\"')
          .replace(/\\"/g, '"');
        
        try {
          parsedResult = JSON.parse(cleaned);
        } catch (e2) {
          console.log('Enhanced JSON cleaning failed:', e2);
          jsonError = e2;
        }
      }
    } else {
      throw new Error('No JSON object found in AI response');
    }
    
    if (parsedResult) {
      // Validate and normalize the result
      const validatedResult: ConfidenceAnalysis = {
        overall_confidence: Math.min(100, Math.max(0, parsedResult.overall_confidence || 0)),
        text_clarity: Math.min(100, Math.max(0, parsedResult.text_clarity || 0)),
        policy_specificity: Math.min(100, Math.max(0, parsedResult.policy_specificity || 0)),
        context_availability: Math.min(100, Math.max(0, parsedResult.context_availability || 0)),
        confidence_factors: Array.isArray(parsedResult.confidence_factors) ? parsedResult.confidence_factors : ['Analysis unavailable']
      };

      console.log('AI-driven confidence analysis completed:', validatedResult);
      return validatedResult;
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
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with [ and end with ]
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON
    - If you cannot provide a value, use null or empty string

    Generate actionable suggestions for improving this YouTube video content based on policy violations and risk factors:

    ${text ? `Content: "${text.substring(0, 1500)}${text.length > 1500 ? '...' : ''}"` : 'No content available'}
    Context from Gemini: ${videoContext ? 'Available' : 'Not available'}

    Policy Analysis:
    ${JSON.stringify(policyAnalysis)}

    Risk Assessment:
    ${JSON.stringify(riskAssessment)}

    Generate 5-12 specific, actionable suggestions. Each suggestion must have:
    - A clear, actionable title
    - Detailed explanation text
    - Priority level (HIGH/MEDIUM/LOW)
    - Impact score (0-100)

    Return ONLY this JSON array format:
    [
      {
        "title": "string (specific action to take)",
        "text": "string (detailed explanation of the suggestion)",
        "priority": "HIGH|MEDIUM|LOW",
        "impact_score": number (0-100)
      }
    ]

    EXAMPLE SUGGESTIONS:
    [
      {
        "title": "Remove Profanity",
        "text": "Consider removing or replacing profane language to improve advertiser-friendliness and reach a broader audience.",
        "priority": "HIGH",
        "impact_score": 85
      },
      {
        "title": "Add Content Warnings",
        "text": "Include appropriate content warnings for sensitive topics to help viewers make informed decisions.",
        "priority": "MEDIUM",
        "impact_score": 60
      }
    ]

    SUGGESTION GUIDELINES:
    - Focus on specific, implementable changes
    - Address the highest risk categories first
    - Provide clear, actionable advice
    - Consider content type and audience
    - If content is safe, suggest growth/monetization tips
    - Each suggestion should be distinct and valuable

    IMPORTANT: Respond ONLY with valid JSON array. Do not include any commentary, explanation, or text outside the JSON array.
  `;

  try {
    const result = await model.generateContent(prompt);
    console.log('AI-driven suggestions raw response length:', result.length);
    console.log('AI-driven suggestions raw response preview:', result.substring(0, 200));
    
    let parsedResult: any = null;
    let jsonError = null;
    
    // Try multiple JSON extraction strategies
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        parsedResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        jsonError = e;
        console.log('Initial JSON parsing failed, attempting enhanced parsing...');
        
        // Try to fix common JSON issues
        let cleaned = jsonMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']')
          .replace(/,\s*"/g, '"')
          .replace(/\\"/g, '"')
          .replace(/"/g, '\\"')
          .replace(/\\"/g, '"');
        
        try {
          parsedResult = JSON.parse(cleaned);
        } catch (e2) {
          console.log('Enhanced JSON cleaning failed:', e2);
          jsonError = e2;
        }
      }
    } else {
      throw new Error('No JSON array found in AI response');
    }
    
    // Validate and normalize the suggestions
    const suggestions: Suggestion[] = Array.isArray(parsedResult) ? parsedResult.map((s: any, index: number) => {
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
    }) : [];

    console.log(`AI-driven suggestions completed with ${suggestions.length} suggestions`);
    return suggestions;

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
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON

    Analyze this content and return ONLY this JSON structure:
    {
      "content_type": "string (Educational|Entertainment|Gaming|Music|Tutorial|Review|Vlog|Other)",
      "target_audience": "string (General Audience|Teens|Children|Professional|Educational|Other)",
      "monetization_impact": number (0-100),
      "content_length": number (word count),
      "language_detected": "string (English|Spanish|French|German|Other)",
      "content_quality": "string (high|medium|low)",
      "engagement_level": "string (high|medium|low)",
      "visual_elements": ["array of visual elements detected"],
      "audio_quality": "string (high|medium|low)",
      "production_value": "string (high|medium|low)",
      "content_complexity": "string (simple|moderate|complex)",
      "brand_safety_concerns": ["array of brand safety concerns"],
      "monetization_potential": "string (high|medium|low)"
    }

    CONTENT TO ANALYZE:
    "${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"

    ANALYSIS GUIDELINES:
    - Content Type: Determine the primary genre/category of the content
    - Target Audience: Identify the intended demographic
    - Monetization Impact: Score 0-100 based on advertiser-friendliness and revenue potential
    - Content Quality: Assess production value and polish
    - Engagement Level: Estimate viewer engagement potential
    - Visual Elements: Identify visual components mentioned or implied
    - Audio Quality: Assess audio production value
    - Production Value: Overall production quality assessment
    - Content Complexity: Evaluate sophistication and depth
    - Brand Safety: Identify potential brand safety concerns
    - Monetization Potential: Estimate revenue generation capability

    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize the result
    const validatedResult = {
      content_type: parsedResult.content_type || 'Other',
      target_audience: parsedResult.target_audience || 'General Audience',
      monetization_impact: Math.min(100, Math.max(0, parsedResult.monetization_impact || 50)),
      content_length: parsedResult.content_length || text.split(' ').length,
      language_detected: parsedResult.language_detected || 'English',
      content_quality: parsedResult.content_quality || 'medium',
      engagement_level: parsedResult.engagement_level || 'medium',
      visual_elements: Array.isArray(parsedResult.visual_elements) ? parsedResult.visual_elements : [],
      audio_quality: parsedResult.audio_quality || 'medium',
      production_value: parsedResult.production_value || 'medium',
      content_complexity: parsedResult.content_complexity || 'moderate',
      brand_safety_concerns: Array.isArray(parsedResult.brand_safety_concerns) ? parsedResult.brand_safety_concerns : [],
      monetization_potential: parsedResult.monetization_potential || 'medium'
    };

    console.log('AI-driven context analysis completed:', validatedResult);
    return validatedResult;

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
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON

    Analyze this content for AI generation patterns and return ONLY this JSON structure:
    {
      "ai_probability": number (0-100),
      "confidence": number (0-100),
      "patterns": ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected.'"],
      "indicators": {
        "repetitive_language": number (0-100),
        "structured_content": number (0-100),
        "personal_voice": number (0-100),
        "grammar_consistency": number (0-100),
        "natural_flow": number (0-100)
      },
      "explanation": "string (detailed explanation of analysis)"
    }

    CONTENT TO ANALYZE:
    "${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"

    ANALYSIS GUIDELINES:
    - Be VERY conservative in AI detection - only flag content with CLEAR, OBVIOUS AI generation patterns
    - Consider content type and context when assessing AI probability
    - Structured content (tutorials, educational) is normal and doesn't indicate AI generation
    - Professional content can be well-produced but still human-created
    - Personal elements strongly indicate human content
    - Visual elements and screen recordings indicate human interaction
    - Brand references in design work are normal for human designers
    - Gaming content can have structure but is often human-created
    - Conceptual content (alcohol-related design work) is typical of human designers

    ONLY flag as AI-generated if you detect MULTIPLE of these CLEAR indicators:
    1. Unnaturally perfect grammar with ZERO errors in casual speech
    2. Complete absence of personal pronouns (I, me, my, we, our) in personal content
    3. Overly formal academic tone in casual/entertainment content
    4. Exact repetitive sentence structures (not just similar topics)
    5. Complete lack of current slang, cultural references, or timely mentions
    6. Unnatural topic transitions that don't follow human thought patterns
    7. Perfect spelling with no typos in conversational content
    8. Template-like structure that's too rigid for human storytelling

    DO NOT flag for:
    - Structured narratives (normal for storytelling)
    - Repetitive terminology (normal for specialized content)
    - Consistent grammar (normal for professional content)
    - Template intros/outros (standard YouTube format)
    - Personal anecdotes (indicates human content)
    - Natural speech patterns with minor errors

    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize the result
    const validatedResult = {
      ai_probability: Math.min(100, Math.max(0, parsedResult.ai_probability || 0)),
      confidence: Math.min(100, Math.max(0, parsedResult.confidence || 0)),
      patterns: Array.isArray(parsedResult.patterns) ? parsedResult.patterns : ['No specific AI patterns detected.'],
      indicators: {
        repetitive_language: Math.min(100, Math.max(0, parsedResult.indicators?.repetitive_language || 0)),
        structured_content: Math.min(100, Math.max(0, parsedResult.indicators?.structured_content || 0)),
        personal_voice: Math.min(100, Math.max(0, parsedResult.indicators?.personal_voice || 0)),
        grammar_consistency: Math.min(100, Math.max(0, parsedResult.indicators?.grammar_consistency || 0)),
        natural_flow: Math.min(100, Math.max(0, parsedResult.indicators?.natural_flow || 0))
      },
      explanation: parsedResult.explanation || 'AI detection analysis completed'
    };

    console.log('AI-driven AI detection completed:', validatedResult);
    return validatedResult;

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
  
  const prompt = `
    CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON object.

    JSON FORMATTING RULES:
    - Start with { and end with }
    - All string values must escape quotes as \\"
    - No trailing commas
    - No comments or explanations outside the JSON

    Analyze this content for AI generation patterns and return ONLY this JSON structure:
    {
      "ai_probability": number (0-100),
      "confidence": number (0-100),
      "patterns": ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected'"],
      "indicators": ["array of indicators that suggest AI generation"],
      "explanation": "string explaining the analysis"
    }

    CONTENT TO ANALYZE:
    "${transcript.substring(0, 2000)}${transcript.length > 2000 ? '...' : ''}"

    VIDEO CONTEXT (from Gemini visual analysis):
    ${videoContext}

    CHANNEL CONTEXT:
    ${JSON.stringify(channelContext)}

    ANALYSIS GUIDELINES:
    - AI Probability: Likelihood that this content was AI-generated (0-100)
    - Confidence: Confidence in the AI detection assessment (0-100)
    - Patterns: Specific patterns that indicate AI generation
    - Indicators: General indicators that suggest AI involvement
    - Explanation: Clear explanation of the assessment

    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
  `;

  try {
    const result = await model.performTextAnalysisWithContext(
      prompt,
      videoContext,
      transcript,
      channelContext
    );
    
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    
    // Validate and normalize the result
    const validatedResult = {
      ai_probability: Math.min(100, Math.max(0, parsedResult.ai_probability || 0)),
      confidence: Math.min(100, Math.max(0, parsedResult.confidence || 0)),
      patterns: Array.isArray(parsedResult.patterns) ? parsedResult.patterns : ['No specific AI patterns detected'],
      indicators: Array.isArray(parsedResult.indicators) ? parsedResult.indicators : ['No specific indicators detected'],
      explanation: parsedResult.explanation || 'AI detection analysis completed'
    };

    console.log('AI detection with context completed:', validatedResult);
    return validatedResult;

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
import { getAIModel, SmartAIModel } from './ai-models';
import { 
  EnhancedAnalysisResult
} from '../types/ai-analysis';
import { VideoAnalysisData } from '@/types/video-processing';
import { ChannelContext } from '@/types/user';
import * as Sentry from '@sentry/nextjs';
import { calculateOverallRiskScore, getRiskLevel, generateHighlights, cleanRiskyPhrases } from './analysis-utils';

// Import modular analysis functions
import { performMultiModalContextAnalysis } from './multi-modal-context-analysis';
import { performMultiModalPolicyAnalysis } from './multi-modal-policy-analysis';
import { performMultiModalRiskAssessment } from './multi-modal-risk-assessment';
import { performMultiModalAIDetection, performAIDetectionWithContext } from './multi-modal-ai-detection';
import { performConfidenceAnalysisWithContext } from './multi-modal-confidence-analysis';
import { generateActionableSuggestionsWithContext } from './multi-modal-suggestions';

/**
 * Multi-modal video analysis using Gemini 2.5 Flash Preview
 */
export async function performMultiModalVideoAnalysis(
  videoData: VideoAnalysisData,
  channelContext?: ChannelContext
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
    console.log('Policy categories result:', Object.keys(policyCategories).length, 'categories found');
    if (Object.keys(policyCategories).length === 0) {
      console.warn('No policy categories returned, this indicates a problem with policy analysis');
    }
    
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
        probability: aiDetectionResult.probability,
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
    
  } catch (error: unknown) {
    console.error('Multi-modal analysis failed:', error);
    Sentry.captureException(error, {
      tags: { component: 'multi-modal-analysis', action: 'perform-analysis' },
      extra: { videoId: videoData.videoPath }
    });
    
    // Fallback to text-only analysis
    console.log('Falling back to text-only analysis due to error:', (error as Error).message);
    const fallbackResult = await performTextOnlyAnalysis(videoData, channelContext);
    console.log('Fallback analysis completed with risk score:', fallbackResult.risk_score);
    return fallbackResult;
  }
}

/**
 * Fallback to text-only analysis
 */
async function performTextOnlyAnalysis(videoData: VideoAnalysisData, channelContext?: ChannelContext): Promise<EnhancedAnalysisResult> {
  console.log('Performing text-only analysis as fallback');
  
  // Try to get video context from Gemini for better analysis
  let videoContext = '';
  try {
    const model = getAIModel() as SmartAIModel;
    if (model.supportsMultiModal && videoData.videoPath) {
      console.log('Attempting to get video context for fallback analysis');
      videoContext = await model.getVideoContextWithGemini(
        videoData.videoPath,
        videoData.transcript,
        videoData.metadata
      );
    }
  } catch (error: unknown) {
    console.log('Could not get video context for fallback:', (error as Error).message);
  }
  
  // Build comprehensive content for analysis
  let contentToAnalyze = '';
  
  if (videoData.transcript) {
    contentToAnalyze = videoData.transcript;
  } else if (videoContext) {
    // Use video context if available
    contentToAnalyze = `Video Content Analysis:\n${videoContext}`;
    
    // Add metadata if available
    if (videoData.metadata) {
      contentToAnalyze += `\n\nVideo Metadata:\nTitle: ${videoData.metadata.title || 'No title'}\nDescription: ${videoData.metadata.description || 'No description'}`;
    }
  } else if (videoData.metadata) {
    // Fallback to metadata only
    contentToAnalyze = `Title: ${videoData.metadata.title || 'No title'}\n\nDescription: ${videoData.metadata.description || 'No description'}`;
  } else {
    // Final fallback
    contentToAnalyze = 'Video content analysis - insufficient content available for detailed analysis';
  }
  
  console.log('Text-only analysis content length:', contentToAnalyze.length);
  console.log('Text-only analysis content preview:', contentToAnalyze.substring(0, 200) + '...');
  
  // Import and use the existing enhanced analysis
  const { performEnhancedAnalysis } = await import('./ai-analysis');
  const result = await performEnhancedAnalysis(contentToAnalyze, channelContext);
  
  console.log('Text-only analysis result:', {
    risk_score: result.risk_score,
    policy_categories_count: Object.keys(result.policy_categories || {}).length,
    confidence_score: result.confidence_score
  });
  
  return result;
} 
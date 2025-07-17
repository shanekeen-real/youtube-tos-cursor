import { getAIModel, SmartAIModel } from './ai-models';
import { 
  EnhancedAnalysisResult
} from '../types/ai-analysis';
import { VideoAnalysisData } from './video-processing';
import * as Sentry from '@sentry/nextjs';
import { calculateOverallRiskScore, getRiskLevel, generateHighlights, cleanRiskyPhrases } from './analysis-utils';

// Import modular analysis functions
import { performMultiModalContextAnalysis } from './multi-modal-context-analysis';
import { performMultiModalAIDetection, performAIDetectionWithContext } from './multi-modal-ai-detection';
import { performConfidenceAnalysisWithContext } from './multi-modal-confidence-analysis';
import { generateActionableSuggestionsWithContext } from './multi-modal-suggestions';

// Import text-only versions for hybrid approach
import { performTextOnlyPolicyAnalysis } from './multi-modal-policy-analysis';
import { performTextOnlyRiskAssessment } from './multi-modal-risk-assessment';

/**
 * Hybrid multi-modal + text analysis pipeline with parallel processing
 * 
 * Stage 1: Multi-modal video context extraction (Gemini)
 * Stages 2-5: Parallel processing (2-3 multi-modal, 4-5 text-only with video context)
 * Stages 6-7: Sequential text-only with video context
 */
export async function performHybridMultiModalVideoAnalysis(
  videoData: VideoAnalysisData,
  channelContext?: any
): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  
  try {
    console.log('Starting hybrid multi-modal video analysis with parallel processing');
    
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

    // Stages 2-5: PARALLEL PROCESSING
    console.log('Stages 2-5: Starting parallel processing');
    
    const parallelTasks = [
      // Stage 2: Multi-modal content classification
      performMultiModalContextAnalysis(videoData, model, videoContext),
      
      // Stage 3: AI Detection (if channel context available)
      channelContext ? 
        (videoData.transcript ? 
          performAIDetectionWithContext(videoData.transcript, model, channelContext, videoContext) :
          performMultiModalAIDetection(videoData, model, channelContext, { content_type: 'video', target_audience: 'general', monetization_impact: 50, content_length: videoData.transcript?.length || 0, language_detected: 'English' })
        ) : 
        Promise.resolve(null),
      
      // Stage 4: Text-only policy analysis with video context
      performTextOnlyPolicyAnalysis(
        videoData.transcript || 'Video content analysis',
        { content_type: 'video', target_audience: 'general', monetization_impact: 50, content_length: videoData.transcript?.length || 0, language_detected: 'English' },
        videoContext,
        model
      ),
      
      // Stage 5: Text-only risk assessment with video context
      performTextOnlyRiskAssessment(
        videoData.transcript || 'Video content analysis',
        { content_type: 'video', target_audience: 'general', monetization_impact: 50, content_length: videoData.transcript?.length || 0, language_detected: 'English' },
        videoContext,
        model
      )
    ];

    // Execute all parallel tasks
    const [contextAnalysis, aiDetectionResult, policyCategories, riskAssessment] = await Promise.all(parallelTasks);
    
    console.log('Parallel processing completed:');
    console.log('- Context analysis:', contextAnalysis ? 'success' : 'failed');
    console.log('- AI detection:', aiDetectionResult ? 'success' : 'failed');
    console.log('- Policy analysis:', Object.keys(policyCategories || {}).length, 'categories');
    console.log('- Risk assessment:', riskAssessment ? 'success' : 'failed');

    // Stage 6: Confidence analysis using video context (text-only)
    console.log('Stage 6: Confidence analysis with video context');
    const confidenceAnalysis = await performConfidenceAnalysisWithContext(
      videoData.transcript || 'Video content analysis',
      model,
      Object.entries(policyCategories || {}).map(([category, data]) => ({ ...(data as any), category })),
      contextAnalysis || { content_type: 'video', target_audience: 'general', monetization_impact: 50, content_length: videoData.transcript?.length || 0, language_detected: 'English' },
      videoContext
    );
    
    // Stage 7: Generate suggestions using video context (text-only)
    console.log('Stage 7: Generating suggestions with video context');
    const suggestions = await generateActionableSuggestionsWithContext(
      videoData.transcript || 'Video content analysis',
      model,
      Object.entries(policyCategories || {}).map(([category, data]) => ({ ...(data as any), category })),
      riskAssessment || { overall_risk_score: 0, flagged_section: 'No content analyzed', risk_factors: [], severity_level: 'LOW', risky_spans: [], risky_phrases_by_category: {} },
      videoContext
    );

    // Calculate overall risk score and level
    const overallRiskScore = calculateOverallRiskScore(policyCategories || {}, riskAssessment || {});
    const riskLevel = getRiskLevel(overallRiskScore);
    
    // Generate highlights from policy analysis
    const highlights = generateHighlights(policyCategories || {});
    
    // Clean risky phrases
    const allRiskyPhrases = riskAssessment?.risky_phrases_by_category ? 
      Object.values(riskAssessment.risky_phrases_by_category).flat() : [];
    const cleanedRiskyPhrases = cleanRiskyPhrases(allRiskyPhrases as string[]);
    
    // Get queue status for monitoring
    const queueStatus = model.getQueueStatus();
    console.log('Queue status:', queueStatus);
    
    // Combine all analysis results in the expected EnhancedAnalysisResult format
    const analysisResult: EnhancedAnalysisResult = {
      risk_score: overallRiskScore,
      risk_level: riskLevel,
      confidence_score: confidenceAnalysis.overall_confidence,
      flagged_section: riskAssessment?.flagged_section || 'No content analyzed',
      policy_categories: policyCategories || {},
      context_analysis: contextAnalysis ? {
        content_type: contextAnalysis.content_type,
        target_audience: contextAnalysis.target_audience,
        monetization_impact: contextAnalysis.monetization_impact,
        content_length: contextAnalysis.content_length,
        language_detected: contextAnalysis.language_detected
      } : {
        content_type: 'video',
        target_audience: 'general',
        monetization_impact: 50,
        content_length: videoData.transcript?.length || 0,
        language_detected: 'English'
      },
      highlights,
      suggestions: suggestions.slice(0, 12), // Apply hard limit
      risky_spans: riskAssessment?.risky_spans || [],
      risky_phrases: cleanedRiskyPhrases,
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
        processing_time_ms: Date.now() - startTime,
        content_length: (videoData.transcript || '').length,
        analysis_mode: 'multi-modal',
        queue_status: queueStatus
      }
    };
    
    console.log('Hybrid multi-modal analysis completed successfully with parallel processing');
    console.log('Total processing time:', Date.now() - startTime, 'ms');
    return analysisResult;
    
  } catch (error: any) {
    console.error('Hybrid multi-modal analysis failed:', error);
    Sentry.captureException(error, {
      tags: { component: 'hybrid-multi-modal-analysis', action: 'perform-analysis' },
      extra: { videoId: videoData.videoPath }
    });
    
    // Fallback to text-only analysis
    console.log('Falling back to text-only analysis due to error:', error.message);
    const fallbackResult = await performTextOnlyAnalysis(videoData, channelContext);
    console.log('Fallback analysis completed with risk score:', fallbackResult.risk_score);
    return fallbackResult;
  }
}

/**
 * Fallback to text-only analysis
 */
async function performTextOnlyAnalysis(videoData: VideoAnalysisData, channelContext?: any): Promise<EnhancedAnalysisResult> {
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
  } catch (error: any) {
    console.log('Could not get video context for fallback:', error.message);
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
import { getAIModel, AIModel, RateLimiter } from '../ai-models';
import { ChannelContext } from '../../types/user';
import { 
  PolicyCategoryAnalysis, 
  ContextAnalysis, 
  EnhancedAnalysisResult, 
  RiskSpan, 
  RiskAssessment, 
  ConfidenceAnalysis, 
  Suggestion
} from '../../types/ai-analysis';
import { PERFORMANCE_LIMITS, ANALYSIS_MODES } from '../constants/analysis-config';
import { performContextAnalysis } from '../context-analysis';
import { performPolicyCategoryAnalysisBatched } from '../policy-analysis';
import { performRiskAssessment } from '../risk-assessment';
import { performConfidenceAnalysis } from '../confidence-analysis';
import { generateActionableSuggestions } from '../suggestions';
import { performAIDetection } from '../ai-detection';
import { 
  prepareAnalysisContext, 
  processRiskyContent, 
  calculateFinalMetrics, 
  createAnalysisMetadata 
} from './analysis-utils';
import { handleAnalysisError } from './analysis-fallback';

const rateLimiter = new RateLimiter();

/**
 * Multi-stage analysis pipeline with fallback
 */
export async function performEnhancedAnalysis(text: string, channelContext?: ChannelContext): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  
  // Prepare analysis context
  const context = prepareAnalysisContext(text);
  const model = getAIModel();
  let allRiskySpans: RiskSpan[] = [];
  let riskAssessment: RiskAssessment | undefined;

  try {
    // Stage 1: Content Classification
    await rateLimiter.waitIfNeeded();
    const contextAnalysis = await performContextAnalysis(context.decodedText, model);
    
    // Stage 1.5: AI Detection (if channel context available)
    let aiDetectionResult = null;
    if (channelContext) {
      aiDetectionResult = await performAIDetection(context.decodedText, model, channelContext);
    }
    
    // Stage 2: Policy Category Analysis (with batching)
    const policyAnalysis = await performPolicyCategoryAnalysisBatched(context.decodedText, model, contextAnalysis);

    // Stage 3: Risk Assessment (with chunking for long transcripts)
    await rateLimiter.waitIfNeeded();
    let allRiskyPhrases: string[] = [];
    console.log('Policy analysis results:', JSON.stringify(policyAnalysis, null, 2));
    
    if (context.needsChunking) {
      // Split decoded transcript into overlapping chunks
      const chunks: { text: string; start: number }[] = [];
      let pos = 0;
      while (pos < context.decodedText.length) {
        const chunkText = context.decodedText.slice(pos, pos + context.chunkSize);
        chunks.push({ text: chunkText, start: pos });
        if (pos + context.chunkSize >= context.decodedText.length) break;
        pos += context.chunkSize - context.overlap;
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
    } else {
      riskAssessment = await performRiskAssessment(context.decodedText, model, policyAnalysis, contextAnalysis, true);
      console.log('Risk assessment results:', JSON.stringify(riskAssessment, null, 2));
      if (riskAssessment && riskAssessment.risky_phrases_by_category) {
        const phraseArrays: string[][] = Object.values(riskAssessment.risky_phrases_by_category);
        for (const phrases of phraseArrays) {
          allRiskyPhrases.push(...phrases);
        }
      }
      allRiskySpans = riskAssessment.risky_spans || [];
    }

    // Process risky content (filtering and cleaning)
    const { cleanedRiskyPhrases, cleanedRiskySpans, updatedRiskAssessment } = processRiskyContent(
      allRiskyPhrases,
      allRiskySpans,
      riskAssessment
    );

    // Stage 4: Confidence Analysis
    await rateLimiter.waitIfNeeded();
    const confidenceAnalysis = await performConfidenceAnalysis(context.decodedText, model, policyAnalysis, contextAnalysis);
    
    // Stage 5: Generate Actionable Suggestions
    await rateLimiter.waitIfNeeded();
    const suggestions = await generateActionableSuggestions(context.decodedText, model, policyAnalysis, updatedRiskAssessment || {
      overall_risk_score: 0,
      flagged_section: 'Analysis incomplete',
      risk_factors: [],
      severity_level: 'LOW',
      risky_phrases_by_category: {},
    });
    
    // Apply hard limit to suggestions to prevent overwhelming users
    const limitedSuggestions = suggestions.slice(0, PERFORMANCE_LIMITS.MAX_SUGGESTIONS);
    
    // Calculate final metrics
    const { overallRiskScore, riskLevel, highlights } = calculateFinalMetrics(policyAnalysis, updatedRiskAssessment);
    
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
      flagged_section: updatedRiskAssessment?.flagged_section || 'Analysis incomplete',
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
      risky_spans: cleanedRiskySpans,
      risky_phrases: cleanedRiskyPhrases,
      risky_phrases_by_category: updatedRiskAssessment?.risky_phrases_by_category || {},
      ai_detection: aiDetectionResult ? {
        probability: aiDetectionResult.ai_probability,
        confidence: aiDetectionResult.confidence,
        patterns: aiDetectionResult.patterns,
        indicators: aiDetectionResult.indicators,
        explanation: aiDetectionResult.explanation
      } : null,
      analysis_metadata: createAnalysisMetadata(
        model.name,
        startTime,
        context.decodedText.length,
        'ENHANCED'
      )
    };
  } catch (error: unknown) {
    // Handle errors with proper fallback chain
    return await handleAnalysisError(error, text, model, startTime, context.detectedLanguage);
  }
} 
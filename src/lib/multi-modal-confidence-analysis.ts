import { SmartAIModel } from './ai-models';
import { ConfidenceAnalysis, PolicyCategoryAnalysis, ContextAnalysis } from '../types/ai-analysis';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';
import { MULTI_MODAL_SCHEMAS, MULTI_MODAL_EXAMPLES, getErrorMessage } from './multi-modal-utils';

/**
 * AI-driven confidence analysis using existing AI models
 */
export async function performConfidenceAnalysisWithContext(
  text: string, 
  model: SmartAIModel, 
  policyAnalysis: PolicyCategoryAnalysis[], 
  contextAnalysis: ContextAnalysis, 
  videoContext: string
): Promise<ConfidenceAnalysis> {
  console.log('Performing AI-driven confidence analysis...');
  
  const expectedSchema = MULTI_MODAL_SCHEMAS.confidenceAnalysis;
  const exampleResponse = MULTI_MODAL_EXAMPLES.confidenceAnalysis;
  
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
} 
import { SmartAIModel } from './ai-models';
import { RiskAssessment, RiskAssessmentSchema, ContextAnalysis } from '../types/ai-analysis';
import { VideoAnalysisData } from './video-processing';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';
import { performRiskAssessment } from './risk-assessment';
import { getAllPolicyCategoryKeys, MULTI_MODAL_SCHEMAS, MULTI_MODAL_EXAMPLES } from './multi-modal-utils';

/**
 * Multi-modal risk assessment
 */
export async function performMultiModalRiskAssessment(
  videoData: VideoAnalysisData,
  model: SmartAIModel,
  contextAnalysis: ContextAnalysis,
  videoContext: string
): Promise<RiskAssessment> {
  const expectedSchema = MULTI_MODAL_SCHEMAS.riskAssessment;
  const exampleResponse = MULTI_MODAL_EXAMPLES.riskAssessment;
  
  const basePrompt = `Perform a comprehensive risk assessment of this YouTube video content (both visual and audio/transcript):`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}\n` +
    `${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}\n` +
    `Context: ${JSON.stringify(contextAnalysis)}\n` +
    `${videoContext ? `Additional Video Context: "${videoContext.substring(0, 500)}${videoContext.length > 500 ? '...' : ''}"` : 'No additional video context available'}`,
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
      // Handle case where AI returns array instead of object
      let dataToValidate = parsingResult.data;
      if (Array.isArray(parsingResult.data)) {
        console.warn('AI returned array instead of object, attempting to convert');
        // Try to extract object from array or use first item
        dataToValidate = parsingResult.data[0] || {};
      }
      
      // Validate against the proper schema
      const validationResult = RiskAssessmentSchema.safeParse(dataToValidate);
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Risk assessment validation failed:', validationResult.error);
        
        // Try to fix the data structure before giving up
        console.log('Attempting to normalize data structure...');
        const normalizedData = { ...dataToValidate };
        
        // Fix risky_phrases_by_category if it exists
        if (normalizedData.risky_phrases_by_category && typeof normalizedData.risky_phrases_by_category === 'object') {
          const fixedCategories: { [key: string]: string[] } = {};
          
          for (const [category, value] of Object.entries(normalizedData.risky_phrases_by_category)) {
            if (Array.isArray(value)) {
              // Flatten nested arrays and filter out non-string values
              const flattenedArray: string[] = [];
              const flattenArray = (arr: any[]): void => {
                for (const item of arr) {
                  if (Array.isArray(item)) {
                    flattenArray(item);
                  } else if (typeof item === 'string') {
                    flattenedArray.push(item);
                  }
                }
              };
              flattenArray(value);
              fixedCategories[category] = flattenedArray;
            } else if (typeof value === 'string') {
              // Convert string to array
              fixedCategories[category] = [value];
            } else if (value === null || value === undefined) {
              // Convert null/undefined to empty array
              fixedCategories[category] = [];
            } else {
              // Convert any other type to empty array
              fixedCategories[category] = [];
            }
          }
          
          normalizedData.risky_phrases_by_category = fixedCategories;
          console.log('Normalized risky_phrases_by_category structure (flattened nested arrays)');
        }
        
        // Try validation again with normalized data
        const retryValidation = RiskAssessmentSchema.safeParse(normalizedData);
        if (retryValidation.success) {
          console.log('Validation successful after normalization');
          return retryValidation.data;
        }
        
        // Log the specific validation errors that remain after normalization
        console.error('Validation still failed after normalization. Remaining errors:', retryValidation.error);
        console.log('Normalized data structure:', JSON.stringify(normalizedData, null, 2).substring(0, 1000) + '...');
        
        // Return fallback instead of throwing error
        console.log('Using fallback risk assessment due to validation failure');
        const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
        return await performRiskAssessment(fallbackText, model, contextAnalysis, contextAnalysis);
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
 * AI-driven risk assessment using existing AI models
 */
export async function performAIDrivenRiskAssessment(
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
      `${videoContext ? `Additional Video Context: "${videoContext.substring(0, 500)}${videoContext.length > 500 ? '...' : ''}"` : 'No additional video context available'}\n\n` +
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
      
      // Normalize risky_phrases_by_category to ensure all values are arrays
      if (validatedResult.risky_phrases_by_category && typeof validatedResult.risky_phrases_by_category === 'object') {
        const normalizedCategories: { [key: string]: string[] } = {};
        
        for (const [category, value] of Object.entries(validatedResult.risky_phrases_by_category)) {
          if (Array.isArray(value)) {
            // Flatten nested arrays and filter out non-string values
            const flattenedArray: string[] = [];
            const flattenArray = (arr: any[]): void => {
              for (const item of arr) {
                if (Array.isArray(item)) {
                  flattenArray(item);
                } else if (typeof item === 'string') {
                  flattenedArray.push(item);
                }
              }
            };
            flattenArray(value);
            normalizedCategories[category] = flattenedArray;
          } else if (typeof value === 'string') {
            // Convert string to array
            normalizedCategories[category] = [value];
          } else if (value === null || value === undefined) {
            // Convert null/undefined to empty array
            normalizedCategories[category] = [];
          } else {
            // Convert any other type to empty array
            normalizedCategories[category] = [];
          }
        }
        
        validatedResult.risky_phrases_by_category = normalizedCategories;
      }
      
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
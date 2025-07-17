import { SmartAIModel } from './ai-models';
import { PolicyCategoryAnalysis, ContextAnalysis } from '../types/ai-analysis';
import { VideoAnalysisData } from './video-processing';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';
import { performPolicyCategoryAnalysisBatched } from './policy-analysis';
import { getAllPolicyCategoryKeys, MULTI_MODAL_SCHEMAS, MULTI_MODAL_EXAMPLES } from './multi-modal-utils';

/**
 * Multi-modal policy analysis
 */
export async function performMultiModalPolicyAnalysis(
  videoData: VideoAnalysisData,
  model: SmartAIModel,
  contextAnalysis: ContextAnalysis,
  videoContext: string
): Promise<{ [category: string]: PolicyCategoryAnalysis }> {
  const expectedSchema = MULTI_MODAL_SCHEMAS.policyAnalysis;
  const exampleResponse = MULTI_MODAL_EXAMPLES.policyAnalysis;
  
  const allCategoryKeys = getAllPolicyCategoryKeys();
  const basePrompt = `Analyze this YouTube video content (both visual and audio/transcript) for policy violations across all categories.\n\nCRITICAL: You MUST return a single JSON object with ALL of these 19 policy categories as top-level keys.\nFor each category, provide a risk_score (0-100) based on actual YouTube policy violations:\n- 0-10: No violations detected\n- 11-30: Minor concerns, unlikely to cause issues\n- 31-60: Moderate violations that may affect monetization\n- 61-80: Significant violations that could lead to strikes\n- 81-100: Severe violations that could result in channel termination\n\nDo NOT return an array. Do NOT omit any category.\nThe required keys are: ${allCategoryKeys.join(', ')}.\nIf you do not return all 19 keys, your response will be rejected.\n`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt +
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
      console.log(`Multi-modal policy analysis completed using ${parsingResult.strategy}`);
      console.log('Policy analysis parsed data type:', typeof parsingResult.data);
      console.log('Policy analysis parsed data keys:', Object.keys(parsingResult.data || {}));
      console.log('Policy analysis parsed data preview:', JSON.stringify(parsingResult.data).substring(0, 200) + '...');
      
      // Handle different possible response formats
      let resultObj: { [category: string]: PolicyCategoryAnalysis } = {};
      if (Array.isArray(parsingResult.data)) {
        // Convert array to object
        parsingResult.data.forEach((item: any) => {
          if (item.category) {
            const { category, ...rest } = item;
            resultObj[category] = rest;
          }
        });
      } else if (parsingResult.data.categories) {
        // Already in object format with categories wrapper
        resultObj = parsingResult.data.categories;
      } else if (typeof parsingResult.data === 'object' && parsingResult.data !== null) {
        // Direct object format - check if it has policy category keys
        const hasPolicyKeys = allCategoryKeys.some(key => key in parsingResult.data);
        if (hasPolicyKeys) {
          resultObj = parsingResult.data;
        } else {
          // Unknown object format - try to extract categories or fallback
          console.warn('Unknown policy analysis response format, attempting fallback');
          const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
          return await performPolicyCategoryAnalysisBatched(fallbackText, model, contextAnalysis);
        }
      } else {
        console.warn('Unexpected policy analysis response format, attempting fallback');
        const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
        return await performPolicyCategoryAnalysisBatched(fallbackText, model, contextAnalysis);
      }
      // Convert multi-modal format to PolicyCategoryAnalysis format (robust, safe)
      const convertedResult: { [category: string]: PolicyCategoryAnalysis } = {};
      allCategoryKeys.forEach((key) => {
        const categoryData = resultObj[key] as any;
        if (categoryData && (categoryData.risk_score !== undefined || categoryData.confidence !== undefined)) {
          // Use actual risk_score from AI analysis (0-100 based on YouTube policies)
          let riskScore = 0;
          if (typeof categoryData.risk_score === 'number' && !isNaN(categoryData.risk_score)) {
            riskScore = categoryData.risk_score;
          }
          // Fallback to risk_level conversion if risk_score not available
          else if (categoryData.risk_level) {
            const riskLevel = String(categoryData.risk_level).toLowerCase();
            switch (riskLevel) {
              case 'high':
                riskScore = 80;
                break;
              case 'medium':
                riskScore = 50;
                break;
              case 'low':
                riskScore = 0;
                break;
              default:
                riskScore = 0;
            }
          }
          // Convert description to explanation
          const explanation = categoryData.description || categoryData.explanation || '';
          // Convert recommendations to violations
          const violations = Array.isArray(categoryData.recommendations) ? categoryData.recommendations : (Array.isArray(categoryData.violations) ? categoryData.violations : []);
          // Calculate severity based on actual risk score
          let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
          if (riskScore >= 70) {
            severity = 'HIGH';
          } else if (riskScore >= 30) {
            severity = 'MEDIUM';
          } else {
            severity = 'LOW';
          }
          convertedResult[key] = {
            risk_score: Math.max(0, Math.min(100, riskScore)),
            confidence: typeof categoryData.confidence === 'number' ? Math.max(0, Math.min(100, categoryData.confidence)) : 0,
            violations,
            severity,
            explanation
          };
        } else {
          // Add missing category with safe defaults
          convertedResult[key] = {
            risk_score: 0,
            confidence: 0,
            violations: [],
            severity: 'LOW',
            explanation: ''
          };
        }
      });
      console.log(`Policy analysis converted ${Object.keys(convertedResult).length} categories`);
      return convertedResult;
      
      // If we get here and have no categories, trigger fallback
      const resultKeys = Object.keys(parsingResult.data || {});
      if (resultKeys.length === 0) {
        console.warn('Policy analysis returned empty result, triggering fallback');
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
    console.log('Falling back to text-only policy analysis with text:', fallbackText.substring(0, 100) + '...');
    const fallbackResult = await performPolicyCategoryAnalysisBatched(fallbackText, model, contextAnalysis);
    console.log('Fallback policy analysis result:', Object.keys(fallbackResult).length, 'categories');
    return fallbackResult;
  }
}

/**
 * AI-driven policy analysis using existing AI models
 */
export async function performAIDrivenPolicyAnalysis(
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
      `${videoContext ? `Additional Video Context: "${videoContext.substring(0, 500)}${videoContext.length > 500 ? '...' : ''}"` : 'No additional video context available'}\n\n` +
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
 * Text-only policy analysis using video context as text input
 * This is the optimized version for the hybrid pipeline
 */
export async function performTextOnlyPolicyAnalysis(
  transcript: string,
  contextAnalysis: ContextAnalysis,
  videoContext: string,
  model: SmartAIModel
): Promise<{ [category: string]: PolicyCategoryAnalysis }> {
  console.log('Performing text-only policy analysis with video context');
  
  const allCategoryKeys = getAllPolicyCategoryKeys();
  const expectedSchema = MULTI_MODAL_SCHEMAS.policyAnalysis;
  const exampleResponse = MULTI_MODAL_EXAMPLES.policyAnalysis;
  
  const basePrompt = `Analyze this YouTube video content for policy violations across all categories.\n\nCRITICAL: You MUST return a single JSON object with ALL of these 19 policy categories as top-level keys.\nFor each category, provide a risk_score (0-100) based on actual YouTube policy violations:\n- 0-10: No violations detected\n- 11-30: Minor concerns, unlikely to cause issues\n- 31-60: Moderate violations that may affect monetization\n- 61-80: Significant violations that could lead to strikes\n- 81-100: Severe violations that could result in channel termination\n\nDo NOT return an array. Do NOT omit any category.\nThe required keys are: ${allCategoryKeys.join(', ')}.\nIf you do not return all 19 keys, your response will be rejected.\n`;
  
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt +
    `Transcript: "${transcript}"\n` +
    `Context: ${JSON.stringify(contextAnalysis)}\n` +
    `Video Context: "${videoContext}"\n` +
    `\nAnalyze the content using both the transcript and the detailed video context provided above.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<any>(result, expectedSchema, model);
    
    if (parsingResult.success && parsingResult.data) {
      console.log(`Text-only policy analysis completed using ${parsingResult.strategy}`);
      
      // Handle different possible response formats (same logic as multi-modal)
      let resultObj: { [category: string]: PolicyCategoryAnalysis } = {};
      if (Array.isArray(parsingResult.data)) {
        parsingResult.data.forEach((item: any) => {
          if (item.category) {
            const { category, ...rest } = item;
            resultObj[category] = rest;
          }
        });
      } else if (parsingResult.data.categories) {
        resultObj = parsingResult.data.categories;
      } else if (typeof parsingResult.data === 'object' && parsingResult.data !== null) {
        const hasPolicyKeys = allCategoryKeys.some(key => key in parsingResult.data);
        if (hasPolicyKeys) {
          resultObj = parsingResult.data;
        } else {
          console.warn('Unknown policy analysis response format, attempting fallback');
          return await performPolicyCategoryAnalysisBatched(transcript, model, contextAnalysis);
        }
      } else {
        console.warn('Unexpected policy analysis response format, attempting fallback');
        return await performPolicyCategoryAnalysisBatched(transcript, model, contextAnalysis);
      }
      
      // Convert to PolicyCategoryAnalysis format (same logic as multi-modal)
      const convertedResult: { [category: string]: PolicyCategoryAnalysis } = {};
      allCategoryKeys.forEach((key) => {
        const categoryData = resultObj[key] as any;
        if (categoryData && (categoryData.risk_score !== undefined || categoryData.confidence !== undefined)) {
          let riskScore = 0;
          if (typeof categoryData.risk_score === 'number' && !isNaN(categoryData.risk_score)) {
            riskScore = categoryData.risk_score;
          } else if (categoryData.risk_level) {
            const riskLevel = String(categoryData.risk_level).toLowerCase();
            switch (riskLevel) {
              case 'high': riskScore = 80; break;
              case 'medium': riskScore = 50; break;
              case 'low': riskScore = 0; break;
              default: riskScore = 0;
            }
          }
          
          const explanation = categoryData.description || categoryData.explanation || '';
          const violations = Array.isArray(categoryData.recommendations) ? categoryData.recommendations : 
                           (Array.isArray(categoryData.violations) ? categoryData.violations : []);
          
          let severity: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
          if (riskScore >= 70) severity = 'HIGH';
          else if (riskScore >= 30) severity = 'MEDIUM';
          else severity = 'LOW';
          
          convertedResult[key] = {
            risk_score: Math.max(0, Math.min(100, riskScore)),
            confidence: typeof categoryData.confidence === 'number' ? Math.max(0, Math.min(100, categoryData.confidence)) : 0,
            violations,
            severity,
            explanation
          };
        } else {
          convertedResult[key] = {
            risk_score: 0,
            confidence: 0,
            violations: [],
            severity: 'LOW',
            explanation: ''
          };
        }
      });
      
      console.log(`Text-only policy analysis converted ${Object.keys(convertedResult).length} categories`);
      return convertedResult;
    } else {
      console.error(`Text-only policy analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Text-only policy analysis JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('Text-only policy analysis failed:', error);
    // Fallback to batched analysis
    return await performPolicyCategoryAnalysisBatched(transcript, model, contextAnalysis);
  }
} 
import { AIModel, callAIWithRetry, RateLimiter } from './ai-models';
import { parseJSONSafely, normalizeBatchScores, extractPartialAnalysis } from './json-utils';
import { jsonParsingService } from './json-parsing-service';
import { PolicyCategoryAnalysis, ContextAnalysis, BatchAnalysisSchema, BatchAnalysisResult } from '../types/ai-analysis';
import { YOUTUBE_POLICY_CATEGORIES } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';

const rateLimiter = new RateLimiter();

function getAllPolicyCategoryKeysAndNames() {
  const keys = [];
  for (const [categoryKey, categoryName] of Object.entries(YOUTUBE_POLICY_CATEGORIES)) {
    for (const [subKey, subName] of Object.entries(categoryName)) {
      keys.push({ key: `${categoryKey}_${subKey}`, name: subName });
    }
  }
  return keys;
}

// Stage 2: Policy Category Analysis (Batched)
export async function performPolicyCategoryAnalysisBatched(text: string, model: AIModel, context: ContextAnalysis): Promise<{[key: string]: PolicyCategoryAnalysis}> {
  const policyAnalysis: {[key: string]: PolicyCategoryAnalysis} = {};
  
  const allCategoriesList = getAllPolicyCategoryKeysAndNames();
  const allCategoryKeys = allCategoriesList.map(cat => cat.key);
  
  // Process all categories in a single batch
  const batch = allCategoriesList;
  await rateLimiter.waitIfNeeded();
  
  const prompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object. The response MUST be valid JSON parsable by JSON.parse().

    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\".
    - Do NOT use unescaped double quotes inside any string value.
    - Do NOT include comments or extra text—output ONLY valid JSON.
    - Example: "explanation": "This is a string with an escaped quote: \\\"example\\\"."
    - If a string contains a newline, escape it as \\n.

    Analyze the following content for YouTube policy compliance. For each of the following category KEYS, provide a risk score, confidence, violations, severity, and explanation. You must return a result for every key, even if the risk is 0.

    CRITICAL ANALYSIS GUIDELINES:
    - Be conservative - only flag content that is genuinely problematic
    - Common words like "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose" are NOT policy violations
    - Family/child words like "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" are NOT policy violations - these are normal family content
    - Technology words like "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" are NOT policy violations - these are normal tech content
    - Sports terminology and general discussion are NOT harmful content
    - Only flag actual profanity, hate speech, threats, graphic violence, or sexual content
    - If in doubt, err on the side of NOT flagging content

    Categories (use these KEYS as JSON keys):
    ${allCategoryKeys.map(key => `- ${key}`).join('\n  ')}

    Return all risk scores and confidence values as integers between 0 and 100. Do NOT use a 0-5 or 0-10 scale. Each value must be on a 0-100 scale.

    Content: "${text}"
    Context: ${JSON.stringify(context, null, 2)}

    Provide analysis in JSON format with this structure:
    {
      "categories": {
        "CATEGORY_KEY": {
          "risk_score": 0-100,
          "confidence": 0-100,
          "violations": ["string", ...],
          "severity": "LOW|MEDIUM|HIGH",
          "explanation": "string"
        },
        ...
      }
    }

    AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
  `;

  // Retry logic for batch processing
  let batchProcessed = false;
  let retryCount = 0;
  const maxRetries = 2;
  
  while (!batchProcessed && retryCount <= maxRetries) {
    try {
      const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
      
      // Use the robust JSON parsing service
      const parsingResult = await jsonParsingService.parseJson<BatchAnalysisResult>(result, BatchAnalysisSchema, model);
      
      if (parsingResult.success && parsingResult.data) {
        const validatedAnalysis = parsingResult.data;
        
        if (validatedAnalysis.categories) {
          console.log(`Successfully parsed batch analysis using ${parsingResult.strategy} for ${Object.keys(validatedAnalysis.categories).length} categories`);
          const categoryKeys = Object.keys(validatedAnalysis.categories);
          const riskScores = categoryKeys.map(key => validatedAnalysis.categories[key].risk_score);
          const confidenceScores = categoryKeys.map(key => validatedAnalysis.categories[key].confidence);
          const normalizedRiskScores = normalizeBatchScores(riskScores);
          const normalizedConfidenceScores = normalizeBatchScores(confidenceScores);
          categoryKeys.forEach((categoryKey, idx) => {
            policyAnalysis[categoryKey] = {
              risk_score: normalizedRiskScores[idx],
              confidence: normalizedConfidenceScores[idx],
              violations: validatedAnalysis.categories[categoryKey].violations || [],
              severity: validatedAnalysis.categories[categoryKey].severity || 'LOW',
              explanation: validatedAnalysis.categories[categoryKey].explanation || ''
            };
          });
          batchProcessed = true;
        }
      } else {
        throw new Error(`Policy analysis JSON parsing failed: ${parsingResult.error}`);
      }
    } catch (error) {
      retryCount++;
      console.error(`Batch processing attempt ${retryCount} failed:`, error);
      
      // Track batch processing errors in Sentry
      Sentry.captureException(error, {
        extra: {
          retryCount,
          maxRetries,
          batchSize: batch.length,
          batchCategories: batch.map(cat => cat.key),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown'
        }
      });
      
      if (retryCount > maxRetries) {
        console.error('Max retries reached for batch processing');
        // Provide default analysis for failed batch
        for (const category of batch) {
          policyAnalysis[category.key] = {
            risk_score: 0,
            confidence: 0,
            violations: [],
            severity: 'LOW',
            explanation: 'Analysis failed for this category'
          };
        }
      } else {
        console.log(`Retrying batch processing (attempt ${retryCount + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay before retry
      }
    }
  }
  
  // After filtering out non-canonical categories, fill in missing canonical keys
  for (const catKey of allCategoryKeys) {
    if (!policyAnalysis[catKey]) {
      policyAnalysis[catKey] = {
        risk_score: 0,
        confidence: 0,
        violations: [],
        severity: 'LOW',
        explanation: 'No issues detected for this category.'
      };
    }
  }
  
  return policyAnalysis;
} 
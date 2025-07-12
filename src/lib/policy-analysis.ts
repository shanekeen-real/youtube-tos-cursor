import { AIModel, callAIWithRetry, RateLimiter } from './ai-models';
import { parseJSONSafely, normalizeBatchScores, extractPartialAnalysis } from './json-utils';
import { PolicyCategoryAnalysis, ContextAnalysis, BatchAnalysisSchema } from '../types/ai-analysis';
import { YOUTUBE_POLICY_CATEGORIES } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

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
      const response = result;
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          // Try regular JSON parsing first
          const analysis = JSON.parse(jsonMatch[0]);
          
          // Add detailed logging to debug schema validation
          console.log('Parsed JSON structure:', JSON.stringify(analysis, null, 2));
          console.log('Expected schema structure:', JSON.stringify({
            categories: {
              "example_category": {
                risk_score: 0,
                confidence: 0,
                violations: [],
                severity: "LOW",
                explanation: "string"
              }
            }
          }, null, 2));
          
          // Schema validation
          const validatedAnalysis = BatchAnalysisSchema.parse(analysis);
          
          if (validatedAnalysis.categories) {
            console.log(`Successfully parsed batch analysis for ${Object.keys(validatedAnalysis.categories).length} categories`);
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
        } catch (parseError) {
          console.log('Regular JSON parsing failed, trying enhanced parsing...');
          console.error('Parse error details:', parseError);
          console.error('Raw JSON that failed parsing:', jsonMatch[0]);
          try {
            // Use the enhanced JSON parsing function as fallback
            const analysis = parseJSONSafely(jsonMatch[0]);
            
            console.log('Enhanced parsing result:', JSON.stringify(analysis, null, 2));
            
            // Schema validation
            const validatedAnalysis = BatchAnalysisSchema.parse(analysis);
            
            if (validatedAnalysis.categories) {
              console.log(`Successfully parsed batch analysis using enhanced parsing for ${Object.keys(validatedAnalysis.categories).length} categories`);
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
          } catch (enhancedParseError) {
            console.error('Enhanced parsing also failed:', enhancedParseError);
            console.error('Enhanced parsing error details:', enhancedParseError);
            retryCount++;
            console.error(`Batch parse attempt ${retryCount} failed:`, enhancedParseError);
            console.error('Raw JSON:', jsonMatch[0]);
            
            // Track parsing errors in Sentry
            Sentry.captureException(enhancedParseError, {
              extra: {
                retryCount,
                maxRetries,
                rawJson: jsonMatch[0].substring(0, 500), // Truncate to avoid huge payloads
                batchSize: batch.length,
                batchCategories: batch.map(cat => cat.key)
              }
            });
            
            if (retryCount > maxRetries) {
              console.error('Max retries reached for batch, providing default analysis');
              
              // Try to extract partial information from the malformed JSON
              try {
                const partialAnalysis = extractPartialAnalysis(jsonMatch[0], batch);
                console.log(`Successfully extracted partial analysis for ${Object.keys(partialAnalysis).length} categories`);
                for (const [categoryKey, analysis] of Object.entries(partialAnalysis)) {
                  policyAnalysis[categoryKey] = analysis;
                }
              } catch (extractError) {
                console.error('Failed to extract partial analysis:', extractError);
                // Provide default analysis for failed batch
                for (const category of batch) {
                  policyAnalysis[category.key] = {
                    risk_score: 0,
                    confidence: 0,
                    violations: [],
                    severity: 'LOW',
                    explanation: 'Analysis failed for this category (JSON parse error)'
                  };
                }
              }
            } else {
              console.log(`Retrying batch (attempt ${retryCount + 1}/${maxRetries + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay before retry
            }
          }
        }
      } else {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error('No JSON found in response after max retries');
          // Provide default analysis for failed batch
          for (const category of batch) {
            policyAnalysis[category.key] = {
              risk_score: 0,
              confidence: 0,
              violations: [],
              severity: 'LOW',
              explanation: 'Analysis failed for this category (no JSON response)'
            };
          }
        }
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
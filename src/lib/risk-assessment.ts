import { AIModel, callAIWithRetry } from './ai-models';
import { parseJSONSafely, normalizeBatchScores } from './json-utils';
import { ContextAnalysis, RiskAssessmentSchema } from '../types/ai-analysis';
import { YOUTUBE_POLICY_CATEGORIES } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

function getAllPolicyCategoryKeysAndNames() {
  const keys = [];
  for (const [categoryKey, categoryName] of Object.entries(YOUTUBE_POLICY_CATEGORIES)) {
    for (const [subKey, subName] of Object.entries(categoryName)) {
      keys.push({ key: `${categoryKey}_${subKey}`, name: subName });
    }
  }
  return keys;
}

// Stage 3: Risk Assessment
export async function performRiskAssessment(text: string, model: AIModel, policyAnalysis: any, context: ContextAnalysis, isChunked = false): Promise<any> {
  const allCategoriesList = getAllPolicyCategoryKeysAndNames();
  const allCategoryKeys = allCategoriesList.map(cat => cat.key);
  
  const prompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\".
    - Do NOT use unescaped double quotes inside any string value.
    - Do NOT include comments or extra text—output ONLY valid JSON.
    - Example: "flagged_section": "This is a string with an escaped quote: \\\"example\\\"."
    - If a string contains a newline, escape it as \\n.

    Assess the overall risk level and identify ALL and ONLY the sections of the following content that directly contain policy violations or concerns (do NOT include generic intros, outros, or non-risky text):

    Content: "${text}"
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Context: ${JSON.stringify(context, null, 2)}

    CRITICAL CONTEXT-AWARE RISSESSMENT:
    - For SPORTS content: Terms like "rival", "worried", "team", "player", "score", "goal", "match", "competition", "win", "lose" are completely normal and acceptable. Only flag if there's actual hate speech, threats, or extreme profanity.
    - For GAMING content: Terms like "exploits", "vulnerabilities", "hacking", "cheats", "kills", "weapons", "violence" are typically acceptable in gaming context unless they are:
      * Explicitly teaching real-world harmful activities
      * Promoting actual illegal activities
      * Containing graphic violence descriptions
      * Using excessive profanity
    - For TECHNOLOGY content: Technical terms like "exploits", "vulnerabilities", "hacking" are acceptable when discussing security research or educational content
    - For EDUCATIONAL content: Academic discussions of sensitive topics are generally acceptable
    - For ENTERTAINMENT content: Mild profanity and controversial topics may be acceptable depending on target audience

    CRITICAL FALSE POSITIVE PREVENTION:
    - DO NOT flag common words like "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose", "good", "bad", "big", "small", "new", "old", "first", "last", "best", "worst"
    - DO NOT flag family/child words like "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" - these are normal family content
    - DO NOT flag technology words like "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" - these are normal tech content
    - DO NOT flag sports terminology as harmful content
    - DO NOT flag general discussion words as policy violations
    - Only flag words that are ACTUALLY problematic in context (e.g., actual profanity, hate speech, threats, graphic violence descriptions)
    - If a word could be interpreted multiple ways, err on the side of NOT flagging it

    IMPORTANT: Calculate the overall risk score based on the policy analysis and context. Use a weighted average approach considering all categories. Only assign HIGH risk scores (70-100) for content with serious policy violations. MEDIUM risk (40-69) for moderate concerns. LOW risk (0-39) for minor issues or clean content. Be conservative - don't inflate scores unnecessarily.

    Return the overall risk score as an integer between 0 and 100. Do NOT use a 0-5 or 0-10 scale. The value must be on a 0-100 scale.

    For each policy category, return a list of risky words or phrases that are present in the content and are the reason for the risk in that category. These should be ACTUAL WORDS from the transcript text that are genuinely problematic (e.g., actual profanity like 'fuck', 'shit', actual hate speech, actual threats, etc.), not generic category descriptions or common words. Look for specific words in the transcript that are genuinely risky. If a risky word appears multiple times, include it only once in the list for that category.

    Use these EXACT category keys in the risky_phrases_by_category object:
    ${allCategoryKeys.map(key => `- ${key}`).join('\n    ')}

    Provide risk assessment in JSON format:
    {
      "overall_risk_score": "number (0-100)",
      "flagged_section": "string (most concerning part of the content)",
      "risk_factors": ["list of main risk factors"],
      "severity_level": "LOW|MEDIUM|HIGH",
      "risky_phrases_by_category": {
        "CATEGORY_KEY": ["risky word or phrase", ...],
        ...
      }
    }

    Guidelines:
    - For each policy category, include ONLY genuinely risky words/phrases that are the reason for the risk.
    - Look for ACTUAL WORDS from the transcript text, not generic descriptions.
    - Examples of genuinely risky words: actual profanity like "fuck", "shit", "damn", "ass", "bitch", "crap", "hell", "god damn"
    - Examples of genuinely risky content: actual hate speech, actual threats, actual graphic violence descriptions, actual sexual content
    - DO NOT flag: "you", "worried", "rival", "team", "player", "goal", "score", "match", "game", "play", "win", "lose", "good", "bad", "big", "small", "new", "old", "first", "last", "best", "worst", "money", "dollar", "price", "cost", "value", "worth", "expensive", "cheap"
    - DO NOT flag family/child words: "kid", "kids", "child", "children", "boy", "girl", "son", "daughter", "family", "parent", "mom", "dad", "baby", "toddler", "teen", "teenager" - these are normal family content
    - DO NOT flag technology words: "phone", "device", "mobile", "cell", "smartphone", "tablet", "computer", "laptop", "screen", "display", "keyboard", "mouse" - these are normal tech content
    - DO NOT flag common sports terminology as harmful content
    - DO NOT flag general discussion words as policy violations
    - If a word could be interpreted multiple ways, err on the side of NOT flagging it
    - Do NOT include generic category descriptions like "property damage" or "dangerous acts".
    - If a risky word/phrase appears in multiple categories, include it in each relevant category.
    - If no risky words/phrases found for a category, return an empty array for that category.
    - If no risky sections found, return empty arrays.
    - The overall risk score should reflect the highest risk categories from the policy analysis.
    - Use the EXACT category keys listed above in the risky_phrases_by_category object.

    AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
  `;

  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
      const response = result;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = RiskAssessmentSchema.parse(parsed);
        validated.overall_risk_score = normalizeBatchScores([validated.overall_risk_score])[0];
        return validated;
      } catch (parseError) {
        console.log('Regular JSON parsing failed, trying enhanced parsing...');
        const parsed = parseJSONSafely(jsonMatch[0]);
        const validated = RiskAssessmentSchema.parse(parsed);
        validated.overall_risk_score = normalizeBatchScores([validated.overall_risk_score])[0];
        return validated;
      }
    } catch (err) {
      retryCount++;
      console.error(`Risk assessment parse attempt ${retryCount} failed:`, err);
      
      // Track parsing errors in Sentry
      Sentry.captureException(err, {
        extra: {
          retryCount,
          maxRetries,
          function: 'performRiskAssessment'
        }
      });
      
      if (retryCount > maxRetries) {
        return {
          flagged_section: 'Analysis incomplete',
          overall_risk_score: 0,
          risk_factors: [],
          severity_level: 'LOW'
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Helper to merge/expand overlapping or adjacent risky spans
export function mergeOverlappingSpans(spans: any[], decodedText: string): any[] {
  if (!spans.length) return [];
  // Sort by start_index
  spans = spans.slice().sort((a, b) => a.start_index - b.start_index);
  const merged: any[] = [];
  let prev = spans[0];
  for (let i = 1; i < spans.length; i++) {
    const curr = spans[i];
    // If overlapping or adjacent, merge
    if (curr.start_index <= prev.end_index + 1 && curr.risk_level === prev.risk_level && curr.policy_category === prev.policy_category) {
      prev.end_index = Math.max(prev.end_index, curr.end_index);
      prev.text += decodedText.slice(prev.end_index, curr.end_index);
    } else {
      merged.push(prev);
      prev = curr;
    }
  }
  merged.push(prev);
  return merged;
} 
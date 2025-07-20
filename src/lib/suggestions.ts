import { AIModel } from './ai-models';
import { PolicyCategoryAnalysis, RiskAssessment, Suggestion } from '../types/ai-analysis';
import { jsonParsingService } from './json-parsing-service';
import { SuggestionsSchema } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

// Interface for the parsed suggestions response
interface SuggestionsResponse {
  suggestions: Suggestion[];
}

// Stage 5: Generate Actionable Suggestions
export async function generateActionableSuggestions(text: string, model: AIModel, policyAnalysis: { [category: string]: PolicyCategoryAnalysis }, riskAssessment: RiskAssessment): Promise<Suggestion[]> {
  const basePrompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\\".
    - Do NOT use unescaped double quotes inside any string value.
    - Do NOT include comments or extra text—output ONLY valid JSON.
    - Example: "text": "This is a string with an escaped quote: \\\"example\\\"."
    - If a string contains a newline, escape it as \\n.
    Generate specific, actionable suggestions to improve the following content based on the analysis:
    Content: "${text}"
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Risk Assessment: ${JSON.stringify(riskAssessment, null, 2)}
    All suggestions should be phrased as advice or recommendations (e.g., 'It is advised to...', 'Consider...', 'We recommend...'), not as direct commands. Avoid imperative language.
    You MUST provide between 5-12 actionable suggestions for every scan, regardless of risk level. If the content is very safe, include tips for growth, engagement, monetization, or best practices.
    CRITICAL: Do NOT exceed 12 suggestions. Focus on the most important and actionable recommendations.
    Provide suggestions in JSON format:
    {
      "suggestions": [
        {
          "title": "string (suggestion title)",
          "text": "string (detailed explanation)",
          "priority": "HIGH|MEDIUM|LOW",
          "impact_score": "number (0-100, how much this will improve the content)"
        }
      ]
    }
    Focus on practical, implementable changes that will reduce policy violations and improve monetization potential.
    AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
  `;

  // Use robust JSON parsing service
  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      const result = await model.generateContent(basePrompt);
      
      // Use the robust JSON parsing service
      const parsingResult = await jsonParsingService.parseJson<SuggestionsResponse>(result, SuggestionsSchema, model);
      
      if (parsingResult.success && parsingResult.data) {
        console.log(`Suggestions generated using ${parsingResult.strategy}`);
        let suggestions = parsingResult.data.suggestions.slice(0, 12);
        if (suggestions.length < 5) {
          const padCount = 5 - suggestions.length;
          for (let i = 0; i < padCount; i++) {
            suggestions.push({
              title: 'General Best Practice',
              text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
              priority: 'LOW',
              impact_score: 40
            });
          }
        }
        return suggestions;
      } else {
        throw new Error(`Suggestions JSON parsing failed: ${parsingResult.error}`);
      }
    } catch (err) {
      retryCount++;
      Sentry.captureException(err, {
        extra: {
          retryCount,
          maxRetries,
          function: 'generateActionableSuggestions',
          note: 'Suggestions parse error',
        }
      });
      if (retryCount > maxRetries) {
        const suggestions: Suggestion[] = [{
          title: 'Review Content',
          text: 'Please review your content for potential policy violations.',
          priority: 'MEDIUM' as const,
          impact_score: 50
        }];
        while (suggestions.length < 5) {
          suggestions.push({
            title: 'General Best Practice',
            text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
            priority: 'LOW' as const,
            impact_score: 40
          });
        }
        return suggestions;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  // Final fallback
  const suggestions: Suggestion[] = [{
    title: 'Review Content',
    text: 'Please review your content for potential policy violations.',
    priority: 'MEDIUM' as const,
    impact_score: 50
  }];
  while (suggestions.length < 5) {
    suggestions.push({
      title: 'General Best Practice',
      text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
      priority: 'LOW' as const,
      impact_score: 40
    });
  }
  return suggestions;
} 
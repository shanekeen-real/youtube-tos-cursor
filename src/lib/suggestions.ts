import { AIModel, callAIWithRetry } from './ai-models';
import { parseJSONSafely } from './json-utils';
import { SuggestionsSchema } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

// Stage 5: Generate Actionable Suggestions
export async function generateActionableSuggestions(text: string, model: AIModel, policyAnalysis: any, riskAssessment: any): Promise<any[]> {
  const prompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\".
    - Do NOT use unescaped double quotes inside any string value.
    - Do NOT include comments or extra text—output ONLY valid JSON.
    - Example: "text": "This is a string with an escaped quote: \\\"example\\\"."
    - If a string contains a newline, escape it as \\n.

    Generate specific, actionable suggestions to improve the following content based on the analysis:

    Content: "${text}"
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Risk Assessment: ${JSON.stringify(riskAssessment, null, 2)}

    All suggestions should be phrased as advice or recommendations (e.g., 'It is advised to...', 'Consider...', 'We recommend...'), not as direct commands. Avoid imperative language.

    You MUST provide at least 5 actionable suggestions for every scan, regardless of risk level. If the content is very safe, include tips for growth, engagement, monetization, or best practices.

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
        const validated = SuggestionsSchema.parse(parsed);
        // Ensure at least 5 suggestions
        let suggestions = validated.suggestions;
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
      } catch (parseError) {
        console.log('Regular JSON parsing failed, trying enhanced parsing...');
        const parsed = parseJSONSafely(jsonMatch[0]);
        const validated = SuggestionsSchema.parse(parsed);
        // Ensure at least 5 suggestions
        let suggestions = validated.suggestions;
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
      }
    } catch (err) {
      retryCount++;
      console.error(`Suggestions parse attempt ${retryCount} failed:`, err);
      
      // Track parsing errors in Sentry
      Sentry.captureException(err, {
        extra: {
          retryCount,
          maxRetries,
          function: 'generateActionableSuggestions'
        }
      });
      
      if (retryCount > maxRetries) {
        // Pad to 5 suggestions if needed
        const suggestions = [{
          title: 'Review Content',
          text: 'Please review your content for potential policy violations.',
          priority: 'MEDIUM',
          impact_score: 50
        }];
        while (suggestions.length < 5) {
          suggestions.push({
            title: 'General Best Practice',
            text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
            priority: 'LOW',
            impact_score: 40
          });
        }
        return suggestions;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  // Final fallback
  const suggestions = [{
    title: 'Review Content',
    text: 'Please review your content for potential policy violations.',
    priority: 'MEDIUM',
    impact_score: 50
  }];
  while (suggestions.length < 5) {
    suggestions.push({
      title: 'General Best Practice',
      text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
      priority: 'LOW',
      impact_score: 40
    });
  }
  return suggestions;
} 
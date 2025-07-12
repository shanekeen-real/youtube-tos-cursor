import { AIModel, callAIWithRetry } from './ai-models';
import { parseJSONSafely } from './json-utils';
import { ContextAnalysis, ConfidenceAnalysisSchema } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

// Stage 4: Confidence Analysis
export async function performConfidenceAnalysis(text: string, model: AIModel, policyAnalysis: any, context: ContextAnalysis): Promise<any> {
  const prompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\".
    - Do NOT use unescaped double quotes inside any string value.
    - Do NOT include comments or extra text—output ONLY valid JSON.
    - Example: "confidence_factors": ["This is a string with an escaped quote: \\\"example\\\"."]
    - If a string contains a newline, escape it as \\n.

    Assess the confidence level of the following analysis:

    Content Length: ${text.length} characters
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Content Context: ${JSON.stringify(context, null, 2)}

    Consider:
    - Text clarity and ambiguity
    - Policy specificity
    - Context availability
    - Analysis consistency

    Provide confidence assessment in JSON format:
    {
      "overall_confidence": "number (0-100)",
      "text_clarity": "number (0-100)",
      "policy_specificity": "number (0-100)",
      "context_availability": "number (0-100)",
      "confidence_factors": ["list of factors affecting confidence"]
    }

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
        const validated = ConfidenceAnalysisSchema.parse(parsed);
        return validated;
      } catch (parseError) {
        console.log('Regular JSON parsing failed, trying enhanced parsing...');
        const parsed = parseJSONSafely(jsonMatch[0]);
        const validated = ConfidenceAnalysisSchema.parse(parsed);
        return validated;
      }
    } catch (err) {
      retryCount++;
      console.error(`Confidence analysis parse attempt ${retryCount} failed:`, err);
      
      // Track parsing errors in Sentry
      Sentry.captureException(err, {
        extra: {
          retryCount,
          maxRetries,
          function: 'performConfidenceAnalysis'
        }
      });
      
      if (retryCount > maxRetries) {
        return {
          overall_confidence: 50,
          text_clarity: 50,
          policy_specificity: 50,
          context_availability: 50,
          confidence_factors: ['Analysis confidence could not be determined']
        };
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
} 
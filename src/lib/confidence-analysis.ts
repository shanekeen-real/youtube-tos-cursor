import { AIModel } from './ai-models';
import { jsonParsingService } from './json-parsing-service';
import { ContextAnalysis, ConfidenceAnalysisSchema } from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

// Stage 4: Confidence Analysis
export async function performConfidenceAnalysis(text: string, model: AIModel, policyAnalysis: any, context: ContextAnalysis): Promise<any> {
  const basePrompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\\".
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

  // Use robust JSON parsing service
  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      const result = await model.generateContent(basePrompt);
      
      // Use the robust JSON parsing service
      const parsingResult = await jsonParsingService.parseJson<any>(result, ConfidenceAnalysisSchema, model);
      
      if (parsingResult.success && parsingResult.data) {
        console.log(`Confidence analysis completed using ${parsingResult.strategy}`);
        return parsingResult.data;
      } else {
        throw new Error(`Confidence analysis JSON parsing failed: ${parsingResult.error}`);
      }
    } catch (err) {
      retryCount++;
      Sentry.captureException(err, {
        extra: {
          retryCount,
          maxRetries,
          function: 'performConfidenceAnalysis',
          note: 'Confidence analysis parse error',
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
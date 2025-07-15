import { jsonrepair } from 'jsonrepair';
import { parseJSONSafely } from './json-utils';
import { createJsonOnlyPrompt, createFallbackPrompt, createRepairPrompt } from './prompt-utils';
import { AIModel } from './ai-models';
import * as Sentry from '@sentry/nextjs';

export interface JsonParsingOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  enableAiRepair?: boolean;
  enableValidation?: boolean;
  logAttempts?: boolean;
}

export interface JsonParsingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  strategy: string;
  originalResponse: string;
  repairedResponse?: string;
}

/**
 * Comprehensive JSON parsing service with multiple strategies
 */
export class JsonParsingService {
  private options: Required<JsonParsingOptions>;

  constructor(options: JsonParsingOptions = {}) {
    this.options = {
      maxRetries: 3,
      retryDelayMs: 1000,
      enableAiRepair: true,
      enableValidation: true,
      logAttempts: true,
      ...options
    };
  }

  /**
   * Parse JSON with comprehensive fallback strategies
   */
  async parseJson<T = any>(
    response: string,
    expectedSchema?: any,
    model?: AIModel
  ): Promise<JsonParsingResult<T>> {
    const result: JsonParsingResult<T> = {
      success: false,
      attempts: 0,
      strategy: 'unknown',
      originalResponse: response
    };

    // Strategy 1: Direct JSON parsing
    try {
      const data = JSON.parse(response);
      result.success = true;
      result.data = data;
      result.strategy = 'direct';
      result.attempts = 1;
      return result;
    } catch (error) {
      if (this.options.logAttempts) {
        console.log('Direct JSON parsing failed, trying jsonrepair...');
      }
    }

    // Strategy 2: jsonrepair library
    try {
      const repaired = jsonrepair(response);
      const data = JSON.parse(repaired);
      result.success = true;
      result.data = data;
      result.strategy = 'jsonrepair';
      result.attempts = 2;
      result.repairedResponse = repaired;
      return result;
    } catch (error) {
      if (this.options.logAttempts) {
        console.log('jsonrepair failed, trying legacy strategies...');
      }
    }

    // Strategy 3: Legacy parseJSONSafely
    try {
      const data = parseJSONSafely(response);
      result.success = true;
      result.data = data;
      result.strategy = 'legacy';
      result.attempts = 3;
      return result;
    } catch (error) {
      if (this.options.logAttempts) {
        console.log('Legacy parsing failed, trying AI repair...');
      }
    }

    // Strategy 4: AI-powered JSON repair (if model available)
    if (this.options.enableAiRepair && model && expectedSchema) {
      try {
        const aiRepaired = await this.repairWithAI(response, expectedSchema, model);
        if (aiRepaired.success) {
          result.success = true;
          result.data = aiRepaired.data;
          result.strategy = 'ai-repair';
          result.attempts = 4;
          result.repairedResponse = aiRepaired.repairedResponse;
          return result;
        }
      } catch (error) {
        if (this.options.logAttempts) {
          console.log('AI repair failed:', error);
        }
      }
    }

    // Strategy 5: Retry with different approaches
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        await this.delay(this.options.retryDelayMs * attempt);
        
        // Try different cleaning strategies
        const cleaned = this.cleanResponse(response, attempt);
        const data = JSON.parse(cleaned);
        
        result.success = true;
        result.data = data;
        result.strategy = `retry-${attempt}`;
        result.attempts = 4 + attempt;
        result.repairedResponse = cleaned;
        return result;
      } catch (error) {
        if (this.options.logAttempts) {
          console.log(`Retry ${attempt} failed, trying next approach...`);
        }
      }
    }

    // All strategies failed
    result.error = 'All JSON parsing strategies failed';
    result.strategy = 'failed';
    result.attempts = 4 + this.options.maxRetries;

    // Log to Sentry for monitoring
    Sentry.captureException(new Error('JSON parsing service failed'), {
      extra: {
        originalResponse: response.substring(0, 500),
        attempts: result.attempts,
        strategies: ['direct', 'jsonrepair', 'legacy', 'ai-repair', 'retries']
      }
    });

    return result;
  }

  /**
   * Use AI to repair malformed JSON
   */
  private async repairWithAI(
    malformedJson: string,
    expectedSchema: any,
    model: AIModel
  ): Promise<JsonParsingResult> {
    const repairPrompt = createRepairPrompt(malformedJson, JSON.stringify(expectedSchema, null, 2));
    
    try {
      const aiResponse = await model.generateContent(repairPrompt);
      
      // Try to parse the AI's repair attempt
      const repaired = jsonrepair(aiResponse);
      const data = JSON.parse(repaired);
      
      return {
        success: true,
        data,
        attempts: 1,
        strategy: 'ai-repair',
        originalResponse: malformedJson,
        repairedResponse: repaired
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI repair failed',
        attempts: 1,
        strategy: 'ai-repair-failed',
        originalResponse: malformedJson
      };
    }
  }

  /**
   * Clean response with different strategies
   */
  private cleanResponse(response: string, attempt: number): string {
    let cleaned = response.trim();

    switch (attempt) {
      case 1:
        // Remove markdown and extract JSON
        cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        return jsonMatch ? jsonMatch[0] : cleaned;

      case 2:
        // Fix common quote issues
        cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");
        cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
        return cleaned;

      case 3:
        // More aggressive cleaning
        cleaned = cleaned.replace(/\n/g, '\\n');
        cleaned = cleaned.replace(/\r/g, '\\r');
        cleaned = cleaned.replace(/\t/g, '\\t');
        return cleaned;

      default:
        return cleaned;
    }
  }

  /**
   * Create a robust prompt for JSON-only responses
   */
  createRobustPrompt(
    basePrompt: string,
    expectedSchema: string,
    exampleResponse: string
  ): string {
    return createJsonOnlyPrompt(basePrompt, expectedSchema, exampleResponse);
  }

  /**
   * Create a fallback prompt when parsing fails
   */
  createFallbackPrompt(
    basePrompt: string,
    expectedSchema: string,
    errorContext: string
  ): string {
    return createFallbackPrompt(basePrompt, expectedSchema, errorContext);
  }

  /**
   * Validate if a response is valid JSON
   */
  async validateJson(response: string, model?: AIModel): Promise<boolean> {
    try {
      JSON.parse(response);
      return true;
    } catch (error) {
      if (model) {
        // Use AI to validate
        try {
          const validationPrompt = `
Validate if this is valid JSON:
${response}

Respond with only: {"valid": true} or {"valid": false, "error": "description"}
`;
          const aiResponse = await model.generateContent(validationPrompt);
          const validation = JSON.parse(aiResponse);
          return validation.valid === true;
        } catch (aiError) {
          return false;
        }
      }
      return false;
    }
  }

  /**
   * Extract structured data from narrative text
   */
  async extractFromNarrative<T = any>(
    narrativeText: string,
    targetSchema: any,
    extractionRules: string[],
    model: AIModel
  ): Promise<JsonParsingResult<T>> {
    const extractionPrompt = `
Extract structured data from this narrative text:

NARRATIVE:
${narrativeText}

TARGET SCHEMA:
${JSON.stringify(targetSchema, null, 2)}

EXTRACTION RULES:
${extractionRules.map(rule => `- ${rule}`).join('\n')}

Return ONLY valid JSON matching the schema. No explanations or commentary.
`;

    try {
      const aiResponse = await model.generateContent(extractionPrompt);
      return await this.parseJson<T>(aiResponse, targetSchema, model);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
        attempts: 1,
        strategy: 'extraction-failed',
        originalResponse: narrativeText
      };
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global JSON parsing service instance
 */
export const jsonParsingService = new JsonParsingService({
  maxRetries: 3,
  retryDelayMs: 1000,
  enableAiRepair: true,
  enableValidation: true,
  logAttempts: true
}); 
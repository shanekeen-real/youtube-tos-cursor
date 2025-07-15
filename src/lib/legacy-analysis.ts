import { AIModel, callAIWithRetry, getModelWithFallback, RateLimiter } from './ai-models';
import { parseJSONSafely } from './json-utils';
import { 
  EnhancedAnalysisResult, 
  BatchAnalysisResult, 
  ContentClassification, 
  RiskAssessment, 
  ConfidenceAnalysis, 
  Suggestion,
  PolicyCategoryAnalysis,
  BatchAnalysisSchema,
  ContentClassificationSchema,
  RiskAssessmentSchema,
  ConfidenceAnalysisSchema,
  SuggestionsSchema
} from '../types/ai-analysis';
import * as Sentry from '@sentry/nextjs';

// Legacy analysis pipeline functions for backward compatibility

// Backward compatibility function
export async function performAnalysis(
  transcript: string,
  context: string,
  user: any
): Promise<EnhancedAnalysisResult> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Perform Complete Analysis",
    },
    async () => {
      const rateLimiter = new RateLimiter();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Starting analysis attempt ${attempt}...`);
          
          // Stage 1: Content Classification
          await rateLimiter.waitIfNeeded();
          const classification = await classifyContent(transcript, context, user);
          console.log('Content classification completed');

          // Stage 2: Policy Categories Analysis (using the new robust function)
          const categories = await analyzePolicyCategories(transcript, context, user);
          console.log('Policy categories analysis completed');

          // Stage 3: Risk Assessment
          await rateLimiter.waitIfNeeded();
          const riskAssessment = await assessRisk(transcript, context, user);
          console.log('Risk assessment completed');

          // Stage 4: Confidence Analysis
          await rateLimiter.waitIfNeeded();
          const confidence = await analyzeConfidence(transcript, context, user);
          console.log('Confidence analysis completed');

          // Stage 5: Suggestions
          await rateLimiter.waitIfNeeded();
          const suggestions = await generateSuggestions(transcript, context, user);
          console.log('Suggestions generation completed');

          // Map legacy pipeline results to EnhancedAnalysisResult
          const overallRiskScore = riskAssessment.overall_risk_score || 0;
          const riskLevel = getRiskLevel(overallRiskScore);
          const highlights = generateHighlights(categories.categories || {});
          const now = new Date();

          return {
            risk_score: overallRiskScore,
            risk_level: riskLevel,
            confidence_score: confidence.overall_confidence || 50,
            flagged_section: riskAssessment.flagged_section || '',
            policy_categories: categories.categories || {},
            context_analysis: {
              ...classification,
              monetization_impact: 50,
              content_length: transcript.split(' ').length,
              language_detected: 'English'
            },
            highlights,
            suggestions,
            analysis_metadata: {
              model_used: 'claude-3-5-sonnet-20241022',
              analysis_timestamp: now.toISOString(),
              processing_time_ms: 0,
              content_length: transcript.length,
              analysis_mode: 'enhanced',
            },
          };

        } catch (error) {
          lastError = error as Error;
          console.error(`Analysis attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
            console.log(`Retrying analysis in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // If all retries failed, throw the last error
      throw new Error(`Complete analysis failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
  );
}

export async function analyzePolicyCategories(
  transcript: string,
  context: string,
  user: any
): Promise<BatchAnalysisResult> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Analyze Policy Categories",
    },
    async () => {
      const model = getModelWithFallback();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Attempt ${attempt}: Analyzing policy categories...`);
          
          const prompt = `You are an expert content analyst specializing in YouTube Terms of Service compliance. Analyze the provided transcript and context to identify potential policy violations across multiple categories.

IMPORTANT: You must respond with ONLY valid JSON. No additional text, explanations, or markdown formatting. The JSON must be properly escaped and valid.

Response Format:
{
  "categories": {
    "Hate Speech": {
      "risk_score": 0-100,
      "confidence": 0-100,
      "violations": ["specific violation details"],
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "explanation": "Detailed explanation of findings"
    },
    "Violence": {
      "risk_score": 0-100,
      "confidence": 0-100,
      "violations": ["specific violation details"],
      "severity": "LOW|MEDIUM|HIGH|CRITICAL", 
      "explanation": "Detailed explanation of findings"
    },
    "Harassment": {
      "risk_score": 0-100,
      "confidence": 0-100,
      "violations": ["specific violation details"],
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "explanation": "Detailed explanation of findings"
    },
    "Misinformation": {
      "risk_score": 0-100,
      "confidence": 0-100,
      "violations": ["specific violation details"],
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "explanation": "Detailed explanation of findings"
    },
    "Copyright": {
      "risk_score": 0-100,
      "confidence": 0-100,
      "violations": ["specific violation details"],
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "explanation": "Detailed explanation of findings"
    }
  }
}

CRITICAL: Ensure all quotes in explanations are properly escaped. Use \\" for quotes within explanations.

Analyze this YouTube video transcript for policy violations:

Context: ${context}

Transcript: ${transcript}

Provide a detailed analysis across all policy categories. Focus on identifying specific violations and providing clear explanations.`;

          const response = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));

          console.log('Raw AI response received, attempting JSON parsing...');
          
          // Use the robust JSON parsing utility
          const parsedResult = parseJSONSafely(response);
          
          // Validate the parsed result
          const validationResult = BatchAnalysisSchema.safeParse(parsedResult);
          if (!validationResult.success) {
            console.error('Validation failed:', validationResult.error);
            throw new Error(`Invalid response structure: ${validationResult.error.message}`);
          }

          console.log('Policy categories analysis completed successfully');
          return validationResult.data;

        } catch (error) {
          lastError = error as Error;
          console.error(`Attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // If all retries failed, throw the last error
      throw new Error(`Policy categories analysis failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
  );
}

async function classifyContent(transcript: string, context: string, user: any): Promise<ContentClassification> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Classify Content",
    },
    async () => {
      const model = getModelWithFallback();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const prompt = `You are an expert content classifier. Analyze the provided transcript and context to classify the content type and identify key themes.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

CRITICAL JSON FORMATTING RULES:
- All string values MUST escape any double quotes inside them as \\".
- Do NOT use unescaped double quotes inside any string value.
- Do NOT include comments or extra text—output ONLY valid JSON.
- Example: "primary_themes": ["This is a string with an escaped quote: \\\"example\\\"."]
- If a string contains a newline, escape it as \\n.

Response Format:
{
  "content_type": "educational|entertainment|news|tutorial|review|other",
  "primary_themes": ["theme1", "theme2", "theme3"],
  "target_audience": "general|children|teens|adults|professional",
  "content_quality": "high|medium|low",
  "engagement_level": "high|medium|low"
}

AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

Classify this YouTube video content:

Context: ${context}

Transcript: ${transcript}

Provide a detailed classification of the content type, themes, and audience.`;

          const response = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));

          const parsedResult = parseJSONSafely(response);
          const validationResult = ContentClassificationSchema.safeParse(parsedResult);
          
          if (!validationResult.success) {
            throw new Error(`Invalid classification response: ${validationResult.error.message}`);
          }

          return validationResult.data;

        } catch (error) {
          lastError = error as Error;
          console.error(`Classification attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(`Content classification failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
  );
}

// Stage 3: Risk Assessment
async function assessRisk(transcript: string, context: string, user: any): Promise<RiskAssessment> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Assess Risk",
    },
    async () => {
      const model = getModelWithFallback();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const prompt = `You are an expert risk assessor specializing in YouTube content compliance. Analyze the provided transcript and context to assess overall risk level.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

CRITICAL JSON FORMATTING RULES:
- All string values MUST escape any double quotes inside them as \\".
- Do NOT use unescaped double quotes inside any string value.
- Do NOT include comments or extra text—output ONLY valid JSON.
- Example: "primary_concerns": ["This is a string with an escaped quote: \\\"example\\\"."]
- If a string contains a newline, escape it as \\n.

Response Format:
{
  "overall_risk_score": 0-100,
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "primary_concerns": ["concern1", "concern2", "concern3"],
  "compliance_status": "compliant|warning|violation",
  "recommended_actions": ["action1", "action2", "action3"]
}

AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

Assess the risk level of this YouTube video:

Context: ${context}

Transcript: ${transcript}

Provide a comprehensive risk assessment with specific concerns and recommended actions.`;

          const response = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));

          const parsedResult = parseJSONSafely(response);
          const validationResult = RiskAssessmentSchema.safeParse(parsedResult);
          
          if (!validationResult.success) {
            throw new Error(`Invalid risk assessment response: ${validationResult.error.message}`);
          }

          return validationResult.data;

        } catch (error) {
          lastError = error as Error;
          console.error(`Risk assessment attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(`Risk assessment failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
  );
}

// Stage 4: Confidence Analysis
async function analyzeConfidence(transcript: string, context: string, user: any): Promise<ConfidenceAnalysis> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Analyze Confidence",
    },
    async () => {
      const model = getModelWithFallback();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const prompt = `You are an expert confidence analyzer. Assess the confidence level of the analysis based on the quality and clarity of the provided transcript and context.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

CRITICAL JSON FORMATTING RULES:
- All string values MUST escape any double quotes inside them as \\".
- Do NOT use unescaped double quotes inside any string value.
- Do NOT include comments or extra text—output ONLY valid JSON.
- Example: "limitations": ["This is a string with an escaped quote: \\\"example\\\"."]
- If a string contains a newline, escape it as \\n.

Response Format:
{
  "overall_confidence": 0-100,
  "transcript_quality": "excellent|good|fair|poor",
  "context_clarity": "excellent|good|fair|poor",
  "analysis_reliability": "high|medium|low",
  "limitations": ["limitation1", "limitation2", "limitation3"]
}

AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

Analyze the confidence level of this analysis:

Context: ${context}

Transcript: ${transcript}

Assess the quality of the input data and the reliability of the analysis.`;

          const response = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));

          const parsedResult = parseJSONSafely(response);
          const validationResult = ConfidenceAnalysisSchema.safeParse(parsedResult);
          
          if (!validationResult.success) {
            throw new Error(`Invalid confidence analysis response: ${validationResult.error.message}`);
          }

          return validationResult.data;

        } catch (error) {
          lastError = error as Error;
          console.error(`Confidence analysis attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(`Confidence analysis failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
  );
}

// Stage 5: Suggestions Generation
async function generateSuggestions(transcript: string, context: string, user: any): Promise<Suggestion[]> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Generate Suggestions",
    },
    async () => {
      const model = getModelWithFallback();
      const maxRetries = 2;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const prompt = `You are an expert content advisor specializing in YouTube compliance. Generate actionable suggestions to improve content compliance and reduce risk.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

CRITICAL JSON FORMATTING RULES:
- All string values MUST escape any double quotes inside them as \\".
- Do NOT use unescaped double quotes inside any string value.
- Do NOT include comments or extra text—output ONLY valid JSON.
- Example: "description": "This is a string with an escaped quote: \\\"example\\\"."
- If a string contains a newline, escape it as \\n.

Response Format:
{
  "suggestions": [
    {
      "title": "Suggestion Title",
      "description": "Detailed description of the suggestion",
      "priority": "high|medium|low",
      "category": "content|technical|legal|engagement",
      "implementation_difficulty": "easy|medium|hard"
    }
  ]
}

AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

Generate suggestions for improving this YouTube video's compliance:

Context: ${context}

Transcript: ${transcript}

Provide actionable, specific suggestions to improve content compliance and reduce risk.`;

          const response = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));

          const parsedResult = parseJSONSafely(response);
          const validationResult = SuggestionsSchema.safeParse(parsedResult);
          
          if (!validationResult.success) {
            throw new Error(`Invalid suggestions response: ${validationResult.error.message}`);
          }

          // Apply hard limit of 12 suggestions to prevent overwhelming users
          let suggestions = validationResult.data.suggestions.slice(0, 12);
          
          return suggestions;

        } catch (error) {
          lastError = error as Error;
          console.error(`Suggestions generation attempt ${attempt} failed:`, error);
          
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      throw new Error(`Suggestions generation failed after ${maxRetries} attempts: ${lastError?.message}`);
    }
  );
}

// Helper functions needed by the legacy pipeline
function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 25) return 'LOW';
  if (score <= 65) return 'MEDIUM';
  return 'HIGH';
}

function generateHighlights(policyAnalysis: { [key: string]: PolicyCategoryAnalysis }): any[] {
  const highlights = [];
  
  for (const [category, analysis] of Object.entries(policyAnalysis)) {
    if ((analysis as PolicyCategoryAnalysis).risk_score > 20) { // Only include significant risks
      highlights.push({
        category: category.replace(/_/g, ' '),
        risk: (analysis as PolicyCategoryAnalysis).severity,
        score: (analysis as PolicyCategoryAnalysis).risk_score,
        confidence: (analysis as PolicyCategoryAnalysis).confidence
      });
    }
  }
  
  // Sort by risk score descending
  highlights.sort((a, b) => b.score - a.score);
  
  return highlights.slice(0, 4); // Return top 4 highlights
} 
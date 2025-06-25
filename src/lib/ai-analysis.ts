import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { usageTracker } from './usage-tracker';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY as string,
});

// Model abstraction layer for seamless switching between Gemini and Claude
interface AIModel {
  generateContent: (prompt: string) => Promise<string>;
  name: string;
}

class GeminiModel implements AIModel {
  name = 'gemini-1.5-flash-latest';
  private model: any;

  constructor() {
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
  }

  async generateContent(prompt: string): Promise<string> {
    usageTracker.recordCall('gemini');
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}

class ClaudeModel implements AIModel {
  name = 'claude-3-haiku-20240307';
  
  async generateContent(prompt: string): Promise<string> {
    usageTracker.recordCall('claude');
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });
    // Join all text blocks from the response
    return message.content
      .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
      .map((c: any) => c.text)
      .join('');
  }
}

// Model selection logic with fallback
function getAIModel(): AIModel {
  // Prefer Claude if API key is available and has credits, otherwise fallback to Gemini
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return new ClaudeModel();
    } catch (error) {
      console.warn('Claude model initialization failed, falling back to Gemini:', error);
    }
  }
  
  // If no Claude key or Claude failed, use Gemini
  if (process.env.GOOGLE_API_KEY) {
    return new GeminiModel();
  }
  
  // If neither key is available, throw a helpful error
  throw new Error('No AI API keys available. Please set either ANTHROPIC_API_KEY or GOOGLE_API_KEY in your environment variables.');
}

// YouTube Policy Taxonomy - Based on actual Community Guidelines
export const YOUTUBE_POLICY_CATEGORIES = {
  CONTENT_SAFETY: {
    VIOLENCE: 'Violence & Graphic Content',
    DANGEROUS_ACTS: 'Dangerous Acts & Challenges',
    HARMFUL_CONTENT: 'Harmful or Dangerous Content',
    CHILD_SAFETY: 'Child Safety',
  },
  COMMUNITY_STANDARDS: {
    HARASSMENT: 'Harassment & Cyberbullying',
    HATE_SPEECH: 'Hate Speech',
    SPAM: 'Spam, Deceptive Practices & Scams',
    MISINFORMATION: 'Misinformation',
  },
  ADVERTISER_FRIENDLY: {
    SEXUAL_CONTENT: 'Sexual Content',
    PROFANITY: 'Profanity & Inappropriate Language',
    CONTROVERSIAL: 'Controversial or Sensitive Topics',
    BRAND_SAFETY: 'Brand Safety Issues',
  },
  LEGAL_COMPLIANCE: {
    COPYRIGHT: 'Copyright & Intellectual Property',
    PRIVACY: 'Privacy & Personal Information',
    TRADEMARK: 'Trademark Violations',
    LEGAL_REQUESTS: 'Legal Requests & Compliance',
  },
  MONETIZATION: {
    AD_POLICIES: 'Ad-Friendly Content Guidelines',
    SPONSORED_CONTENT: 'Sponsored Content Disclosure',
    MONETIZATION_ELIGIBILITY: 'Monetization Eligibility',
  }
} as const;

// Enhanced analysis result structure
export interface PolicyCategoryAnalysis {
  risk_score: number;
  confidence: number;
  violations: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  explanation: string;
}

export interface ContextAnalysis {
  content_type: string;
  target_audience: string;
  monetization_impact: number;
  content_length: number;
  language_detected: string;
}

export interface EnhancedAnalysisResult {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence_score: number;
  flagged_section: string;
  policy_categories: {
    [category: string]: PolicyCategoryAnalysis;
  };
  context_analysis: ContextAnalysis;
  highlights: {
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }[];
  suggestions: {
    title: string;
    text: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    impact_score: number;
  }[];
  analysis_metadata: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: 'enhanced' | 'fallback' | 'emergency';
  };
}

// Content type detection for context-aware analysis
const CONTENT_TYPES = [
  'Gaming', 'Educational', 'Entertainment', 'News', 'Music', 
  'Comedy', 'Tutorial', 'Review', 'Vlog', 'Documentary', 
  'Sports', 'Technology', 'Fashion', 'Cooking', 'Travel'
];

const TARGET_AUDIENCES = [
  'General Audience', 'Children', 'Teens', 'Adults', 'Family',
  'Educational', 'Professional', 'Entertainment'
];

// Rate limiting utility
class RateLimiter {
  private requests: number[] = [];
  private maxRequests = 10; // Conservative limit
  private windowMs = 60000; // 1 minute

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      console.log(`Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter();

// Helper function to handle API calls with quota error retry
async function callAIWithRetry<T>(aiCall: (model: AIModel) => Promise<T>, maxRetries: number = 3): Promise<T> {
  const model = getAIModel();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await aiCall(model);
    } catch (error: any) {
      // Check if it's a quota error (429)
      if (error.status === 429 || (error.message && error.message.includes('429'))) {
        console.log(`Quota limit hit on attempt ${attempt + 1}, retrying in ${Math.pow(2, attempt)}s...`);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          continue;
        }
      }
      // If it's not a quota error or max retries reached, throw immediately
      throw error;
    }
  }
  throw new Error('Max retries exceeded for AI API call');
}

// Helper function to get model with fallback (simplified - just returns primary model)
function getModelWithFallback(): AIModel {
  return getAIModel();
}

// Multi-stage analysis pipeline with fallback
export async function performEnhancedAnalysis(text: string): Promise<EnhancedAnalysisResult> {
  const startTime = Date.now();
  
  if (!text || text.trim().length === 0) {
    throw new Error('No text provided for analysis.');
  }

  const model = getModelWithFallback();

  try {
    // Stage 1: Content Classification
    await rateLimiter.waitIfNeeded();
    const contextAnalysis = await performContextAnalysis(text, model);
    
    // Stage 2: Policy Category Analysis (with batching)
    const policyAnalysis = await performPolicyCategoryAnalysisBatched(text, model, contextAnalysis);
    
    // Stage 3: Risk Assessment
    await rateLimiter.waitIfNeeded();
    const riskAssessment = await performRiskAssessment(text, model, policyAnalysis, contextAnalysis);
    
    // Stage 4: Confidence Analysis
    await rateLimiter.waitIfNeeded();
    const confidenceAnalysis = await performConfidenceAnalysis(text, model, policyAnalysis, contextAnalysis);
    
    // Stage 5: Generate Actionable Suggestions
    await rateLimiter.waitIfNeeded();
    const suggestions = await generateActionableSuggestions(text, model, policyAnalysis, riskAssessment);
    
    // Calculate overall risk score and level
    const overallRiskScore = calculateOverallRiskScore(policyAnalysis, riskAssessment);
    const riskLevel = getRiskLevel(overallRiskScore);
    
    // Generate highlights from policy analysis
    const highlights = generateHighlights(policyAnalysis);
    
    const processingTime = Date.now() - startTime;
    
    return {
      risk_score: overallRiskScore,
      risk_level: riskLevel,
      confidence_score: confidenceAnalysis.overall_confidence,
      flagged_section: riskAssessment.flagged_section,
      policy_categories: policyAnalysis,
      context_analysis: contextAnalysis,
      highlights: highlights,
      suggestions: suggestions,
      analysis_metadata: {
        model_used: model.name,
        analysis_timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
        content_length: text.length,
        analysis_mode: 'enhanced'
      }
    };
  } catch (error: any) {
    console.log('Enhanced analysis failed, falling back to basic analysis:', error.message);
    
    // Track critical errors with Sentry
    Sentry.captureException(error, {
      tags: { component: 'ai-analysis', stage: 'enhanced' },
      extra: { 
        textLength: text.length,
        modelUsed: model.name 
      }
    });
    
    try {
      // Fallback to basic analysis
      const basicResult = await performBasicAnalysis(text, model);
      const processingTime = Date.now() - startTime;
      
      return {
        risk_score: basicResult.risk_score,
        risk_level: basicResult.risk_level,
        confidence_score: 75, // Default confidence for basic analysis
        flagged_section: basicResult.flagged_section,
        policy_categories: {}, // No detailed categories in basic mode
        context_analysis: {
          content_type: 'General',
          target_audience: 'General Audience',
          monetization_impact: 50,
          content_length: text.split(' ').length,
          language_detected: 'English'
        },
        highlights: basicResult.highlights,
        suggestions: basicResult.suggestions,
        analysis_metadata: {
          model_used: model.name,
          analysis_timestamp: new Date().toISOString(),
          processing_time_ms: processingTime,
          content_length: text.length,
          analysis_mode: 'fallback'
        }
      };
    } catch (basicError: any) {
      console.log('Basic analysis also failed, using emergency fallback:', basicError.message);
      
      // Track fallback failures with Sentry
      Sentry.captureException(basicError, {
        tags: { component: 'ai-analysis', stage: 'basic-fallback' },
        extra: { 
          textLength: text.length,
          modelUsed: model.name,
          originalError: error.message
        }
      });
      
      // Emergency fallback - no AI required
      const processingTime = Date.now() - startTime;
      const wordCount = text.split(' ').length;
      
      return {
        risk_score: 50, // Neutral score
        risk_level: 'MEDIUM',
        confidence_score: 25, // Low confidence since no AI analysis
        flagged_section: 'Content analysis unavailable due to service limits',
        policy_categories: {},
        context_analysis: {
          content_type: 'Unknown',
          target_audience: 'General Audience',
          monetization_impact: 50,
          content_length: wordCount,
          language_detected: 'Unknown'
        },
        highlights: [{
          category: 'Service Status',
          risk: 'Analysis Unavailable',
          score: 0,
          confidence: 25
        }],
        suggestions: [{
          title: 'Service Temporarily Unavailable',
          text: 'AI analysis service is currently at capacity. Please try again later or contact support.',
          priority: 'HIGH',
          impact_score: 0
        }],
        analysis_metadata: {
          model_used: 'emergency-fallback',
          analysis_timestamp: new Date().toISOString(),
          processing_time_ms: processingTime,
          content_length: text.length,
          analysis_mode: 'emergency'
        }
      };
    }
  }
}

// Basic analysis fallback
async function performBasicAnalysis(text: string, model: AIModel) {
  const prompt = `
    Act as an expert YouTube policy analyst. Your task is to analyze the following text content and provide a detailed risk assessment based on YouTube's community guidelines and advertiser-friendly policies.

    The user's content to analyze is:
    ---
    "${text}"
    ---

    Based on this content, perform the following actions:

    1.  **Calculate an Overall Risk Score:** Provide a numerical score from 0 (no risk) to 100 (high risk). This score should reflect the content's likelihood of being demonetized or removed. A score of 0-34 is LOW risk, 35-69 is MEDIUM risk, and 70-100 is HIGH risk.

    2.  **Identify the Risk Level:** Based on the score, classify the risk as "LOW", "MEDIUM", or "HIGH".

    3.  **Provide a Flagged Section:** Write a concise, one-sentence summary of the single most significant risk found in the text.

    4.  **Create Risk Highlights:** Identify up to 4 specific policy areas that are at risk. For each highlight, provide the category (e.g., "Hate Speech," "Graphic Violence," "Misinformation"), a risk level ("high", "medium", or "low"), and a confidence score (0-100).

    5.  **Generate Actionable Suggestions:** Provide at least 2-3 specific, actionable suggestions for how the user can improve their content to reduce the identified risks. Each suggestion should have a title and a descriptive text.

    Please return your analysis **only** as a valid JSON object, with no other text or explanation. The JSON object must follow this exact structure:
    {
      "risk_score": <number>,
      "risk_level": "<string>",
      "flagged_section": "<string>",
      "highlights": [
        {
          "category": "<string>",
          "risk": "<string>",
          "score": <number>
        }
      ],
      "suggestions": [
        {
          "title": "<string>",
          "text": "<string>"
        }
      ]
    }
  `;

  const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
  const response = result;

  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonString = response.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonString);
  } else {
    throw new Error("No valid JSON object found in the AI's response.");
  }
}

// Zod schemas for validation
const PolicyCategoryAnalysisSchema = z.object({
  risk_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  violations: z.array(z.string()),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  explanation: z.string()
});

const BatchAnalysisSchema = z.object({
  categories: z.record(z.string(), PolicyCategoryAnalysisSchema)
});

const ContextAnalysisSchema = z.object({
  content_type: z.string(),
  target_audience: z.string(),
  monetization_impact: z.number().min(0).max(100),
  content_length: z.number(),
  language_detected: z.string()
});

const RiskAssessmentSchema = z.object({
  overall_risk_score: z.number().min(0).max(100),
  flagged_section: z.string(),
  risk_factors: z.array(z.string()),
  severity_level: z.enum(['LOW', 'MEDIUM', 'HIGH'])
});

const ConfidenceAnalysisSchema = z.object({
  overall_confidence: z.number().min(0).max(100),
  text_clarity: z.number().min(0).max(100),
  policy_specificity: z.number().min(0).max(100),
  context_availability: z.number().min(0).max(100),
  confidence_factors: z.array(z.string())
});

const SuggestionSchema = z.object({
  title: z.string(),
  text: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  impact_score: z.number().min(0).max(100)
});
const SuggestionsSchema = z.object({
  suggestions: z.array(SuggestionSchema)
});

// Stage 1: Content Classification
async function performContextAnalysis(text: string, model: AIModel): Promise<ContextAnalysis> {
  const prompt = `
    Analyze the following content to determine its context and characteristics:

    Content: "${text}"

    Provide analysis in JSON format with the following structure:
    {
      "content_type": "string (one of: ${CONTENT_TYPES.join(', ')})",
      "target_audience": "string (one of: ${TARGET_AUDIENCES.join(', ')})",
      "monetization_impact": "number (0-100, how likely this content type is to be monetized)",
      "content_length": "number (word count)",
      "language_detected": "string (primary language)"
    }

    Consider:
    - Content genre and style
    - Target demographic
    - Typical monetization success for this content type
    - Language and cultural context
  `;

  const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
  const response = result;
  
  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse context analysis response');
  }
  
  try {
    const contextData = JSON.parse(jsonMatch[0]);
    const validatedData = ContextAnalysisSchema.parse(contextData);
    
    return {
      content_type: validatedData.content_type || 'General',
      target_audience: validatedData.target_audience || 'General Audience',
      monetization_impact: Math.min(100, Math.max(0, validatedData.monetization_impact || 50)),
      content_length: validatedData.content_length || text.split(' ').length,
      language_detected: validatedData.language_detected || 'English'
    };
  } catch (parseError) {
    console.error('Context analysis parse error:', parseError);
    console.error('Raw JSON:', jsonMatch[0]);
    throw new Error('Failed to validate context analysis response');
  }
}

// Stage 2: Policy Category Analysis (Batched)
async function performPolicyCategoryAnalysisBatched(text: string, model: AIModel, context: ContextAnalysis): Promise<{[key: string]: PolicyCategoryAnalysis}> {
  const policyAnalysis: {[key: string]: PolicyCategoryAnalysis} = {};
  
  // Create batches of categories to reduce API calls
  const categoryBatches = [];
  const allCategories = [];
  
  for (const [categoryKey, categoryName] of Object.entries(YOUTUBE_POLICY_CATEGORIES)) {
    for (const [subKey, subName] of Object.entries(categoryName)) {
      allCategories.push({
        key: `${categoryKey}_${subKey}`,
        name: subName
      });
    }
  }
  
  // Split into batches of 5 categories each
  for (let i = 0; i < allCategories.length; i += 5) {
    categoryBatches.push(allCategories.slice(i, i + 5));
  }
  
  // Process each batch
  for (const batch of categoryBatches) {
    await rateLimiter.waitIfNeeded();
    
    const prompt = `
      Analyze the following content for YouTube policy violations across multiple categories:

      Content: "${text}"
      Content Type: ${context.content_type}
      Target Audience: ${context.target_audience}

      Analyze these categories: ${batch.map(cat => cat.name).join(', ')}

      Provide analysis in JSON format:
      {
        "categories": {
          ${batch.map(cat => `"${cat.key}": {
            "risk_score": "number (0-100)",
            "confidence": "number (0-100)",
            "violations": ["array of specific violations"],
            "severity": "LOW|MEDIUM|HIGH",
            "explanation": "detailed explanation"
          }`).join(',\n          ')}
        }
      }

      Be specific about policy violations and their impact on YouTube monetization.
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
            const analysis = JSON.parse(jsonMatch[0]);
            
            // Schema validation
            const validatedAnalysis = BatchAnalysisSchema.parse(analysis);
            
            if (validatedAnalysis.categories) {
              for (const [categoryKey, categoryAnalysis] of Object.entries(validatedAnalysis.categories)) {
                policyAnalysis[categoryKey] = {
                  risk_score: Math.min(100, Math.max(0, categoryAnalysis.risk_score || 0)),
                  confidence: Math.min(100, Math.max(0, categoryAnalysis.confidence || 0)),
                  violations: categoryAnalysis.violations || [],
                  severity: categoryAnalysis.severity || 'LOW',
                  explanation: categoryAnalysis.explanation || ''
                };
              }
              batchProcessed = true;
            }
          } catch (parseError) {
            retryCount++;
            console.error(`Batch parse attempt ${retryCount} failed:`, parseError);
            console.error('Raw JSON:', jsonMatch[0]);
            
            if (retryCount > maxRetries) {
              console.error('Max retries reached for batch, providing default analysis');
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
            } else {
              console.log(`Retrying batch (attempt ${retryCount + 1}/${maxRetries + 1})`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay before retry
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
  }
  
  return policyAnalysis;
}

// Stage 3: Risk Assessment
async function performRiskAssessment(text: string, model: AIModel, policyAnalysis: any, context: ContextAnalysis): Promise<any> {
  const prompt = `
    Assess the overall risk level and identify the most concerning section of the following content:

    Content: "${text}"
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Context: ${JSON.stringify(context, null, 2)}

    Provide risk assessment in JSON format:
    {
      "overall_risk_score": "number (0-100)",
      "flagged_section": "string (most concerning part of the content)",
      "risk_factors": ["list of main risk factors"],
      "severity_level": "LOW|MEDIUM|HIGH"
    }
  `;

  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
      const response = result;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = RiskAssessmentSchema.parse(parsed);
      return validated;
    } catch (err) {
      retryCount++;
      console.error(`Risk assessment parse attempt ${retryCount} failed:`, err);
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

// Stage 4: Confidence Analysis
async function performConfidenceAnalysis(text: string, model: AIModel, policyAnalysis: any, context: ContextAnalysis): Promise<any> {
  const prompt = `
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
  `;

  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
      const response = result;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ConfidenceAnalysisSchema.parse(parsed);
      return validated;
    } catch (err) {
      retryCount++;
      console.error(`Confidence analysis parse attempt ${retryCount} failed:`, err);
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

// Stage 5: Generate Actionable Suggestions
async function generateActionableSuggestions(text: string, model: AIModel, policyAnalysis: any, riskAssessment: any): Promise<any[]> {
  const prompt = `
    Generate specific, actionable suggestions to improve the following content based on the analysis:

    Content: "${text}"
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Risk Assessment: ${JSON.stringify(riskAssessment, null, 2)}

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
  `;

  let retryCount = 0;
  const maxRetries = 2;
  while (retryCount <= maxRetries) {
    try {
      const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
      const response = result;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = SuggestionsSchema.parse(parsed);
      return validated.suggestions;
    } catch (err) {
      retryCount++;
      console.error(`Suggestions parse attempt ${retryCount} failed:`, err);
      if (retryCount > maxRetries) {
        return [{
          title: 'Review Content',
          text: 'Please review your content for potential policy violations.',
          priority: 'MEDIUM',
          impact_score: 50
        }];
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return [];
}

// Helper functions
function calculateOverallRiskScore(policyAnalysis: any, riskAssessment: any): number {
  // Calculate weighted average of all policy category scores
  const categoryScores = Object.values(policyAnalysis).map((cat: any) => cat.risk_score);
  const averageScore = categoryScores.reduce((sum: number, score: number) => sum + score, 0) / categoryScores.length;
  
  // Factor in monetization and removal risk
  const monetizationWeight = 0.4;
  const removalWeight = 0.3;
  const policyWeight = 0.3;
  
  return Math.round(
    (averageScore * policyWeight) +
    ((riskAssessment.overall_risk_score || 0) * monetizationWeight) +
    ((riskAssessment.overall_risk_score || 0) * removalWeight)
  );
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 34) return 'LOW';
  if (score <= 69) return 'MEDIUM';
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
  
  // Sort by risk score descending and limit to top 4
  return highlights
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

// Backward compatibility function
export async function performAnalysis(text: string) {
  const enhancedResult = await performEnhancedAnalysis(text);
  
  // Convert to old format for backward compatibility
  return {
    risk_score: enhancedResult.risk_score,
    risk_level: enhancedResult.risk_level,
    flagged_section: enhancedResult.flagged_section,
    highlights: enhancedResult.highlights.map(h => ({
      category: h.category,
      risk: h.risk,
      score: h.score
    })),
    suggestions: enhancedResult.suggestions.map(s => ({
      title: s.title,
      text: s.text
    }))
  };
} 
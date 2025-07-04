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

// Rate limiting utility - optimized for Claude's actual limits
class RateLimiter {
  private requests: number[] = [];
  private maxRequests = 80; // Increased to match Claude's 100/min limit with safety margin
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
    
    // Remove any accidental 'categories' key from policyAnalysis (artifact of fallback parsing)
    delete policyAnalysis['categories'];
    
    return {
      risk_score: overallRiskScore,
      risk_level: riskLevel,
      confidence_score: confidenceAnalysis.overall_confidence,
      flagged_section: riskAssessment.flagged_section,
      policy_categories: policyAnalysis,
      context_analysis: {
        content_type: 'General',
        target_audience: 'General Audience',
        monetization_impact: 50,
        content_length: text.split(' ').length,
        language_detected: 'English'
      },
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
          content_type: 'General',
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

    5.  **Generate Actionable Suggestions:** Provide exactly 3 specific, actionable suggestions for how the user can improve their content to reduce the identified risks. Each suggestion should have a title and a descriptive text.

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
    const parsedResult = JSON.parse(jsonString);
    
    // Ensure suggestions are limited to 3 for free tier compatibility
    if (parsedResult.suggestions && parsedResult.suggestions.length > 3) {
      console.log(`[DEBUG] Basic analysis returned ${parsedResult.suggestions.length} suggestions, limiting to 3`);
      parsedResult.suggestions = parsedResult.suggestions.slice(0, 3);
    }
    
    return parsedResult;
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

const ContentClassificationSchema = z.object({
  content_type: z.string(),
  primary_themes: z.array(z.string()),
  target_audience: z.string(),
  content_quality: z.string(),
  engagement_level: z.string(),
});

// Batch normalization utility for risk scores and confidence
function normalizeBatchScores(scores: number[]) {
  const maxScore = Math.max(...scores);
  if (maxScore <= 5) {
    console.warn('[AI-NORMALIZE] Detected 0-5 scale, normalizing all scores by 20x');
    return scores.map(s => s * 20);
  }
  if (maxScore <= 10) {
    console.warn('[AI-NORMALIZE] Detected 0-10 scale, normalizing all scores by 10x');
    return scores.map(s => s * 10);
  }
  if (maxScore > 100) {
    console.warn('[AI-NORMALIZE] Detected >100 score, capping all scores at 100');
    return scores.map(s => Math.min(s, 100));
  }
  // Already 0-100
  return scores;
}

// Robust JSON parsing utility with multiple fallback strategies
function parseJSONSafely(jsonString: string): any {
  // Strategy 1: Direct parsing (try this first for valid JSON)
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.log('Direct JSON parsing failed, trying sanitization...');
  }

  // Strategy 2: Simple sanitization for common issues
  try {
    let sanitized = jsonString;
    
    // Only fix trailing commas before closing braces/brackets
    sanitized = sanitized.replace(/,(\\s*[}\]])/g, '$1');
    // Fix non-standard single quote escapes (\')
    sanitized = sanitized.replace(/\\'/g, "'");
    // Try parsing the sanitized JSON
    return JSON.parse(sanitized);
  } catch (error) {
    console.log('Simple sanitization failed, trying regex extraction...');
  }

  // Strategy 3: Extract JSON using regex (only if no valid JSON found)
  try {
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.log('Regex extraction failed');
  }

  // Strategy 4: Manual parsing as last resort
  try {
    const result: any = {};
    
    // Extract categories using regex
    const categoryMatches = jsonString.match(/"([^"]+)"\s*:\s*\{[^}]+\}/g);
    if (categoryMatches) {
      result.categories = {};
      
      for (const match of categoryMatches) {
        const keyMatch = match.match(/"([^"]+)"/);
        if (keyMatch) {
          const key = keyMatch[1];
          
          // Extract basic fields using regex
          const riskScoreMatch = match.match(/"risk_score":\s*(\d+)/);
          const confidenceMatch = match.match(/"confidence":\s*(\d+)/);
          const severityMatch = match.match(/"severity":\s*"([^"]+)"/);
          
          result.categories[key] = {
            risk_score: riskScoreMatch ? parseInt(riskScoreMatch[1]) : 0,
            confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 0,
            violations: [],
            severity: severityMatch ? severityMatch[1] : 'LOW',
            explanation: 'Parsed using fallback method'
          };
        }
      }
      
      return result;
    }
  } catch (error) {
    console.log('Manual parsing failed');
  }

  // Log the failure to Sentry for monitoring
  Sentry.captureException(new Error('All JSON parsing strategies failed'), {
    extra: {
      jsonString: jsonString.substring(0, 500), // Truncate to avoid huge payloads
      strategiesAttempted: ['direct', 'sanitized', 'regex', 'manual']
    }
  });

  throw new Error('All JSON parsing strategies failed');
}

// Helper function to extract partial analysis from malformed JSON
function extractPartialAnalysis(jsonString: string, batch: any[]): {[key: string]: PolicyCategoryAnalysis} {
  const partialAnalysis: {[key: string]: PolicyCategoryAnalysis} = {};
  
  for (const category of batch) {
    try {
      // Try to find the category block in the JSON string
      const categoryPattern = new RegExp(`"${category.key}"\\s*:\\s*\\{([^}]+)\\}`, 'i');
      const match = jsonString.match(categoryPattern);
      
      if (match) {
        const categoryBlock = match[1];
        
        // Extract individual fields using regex
        const riskScoreMatch = categoryBlock.match(/"risk_score"\s*:\s*(\d+)/i);
        const confidenceMatch = categoryBlock.match(/"confidence"\s*:\s*(\d+)/i);
        const severityMatch = categoryBlock.match(/"severity"\s*:\s*"([^"]+)"/i);
        const violationsMatch = categoryBlock.match(/"violations"\s*:\s*\[([^\]]*)\]/i);
        const explanationMatch = categoryBlock.match(/"explanation"\s*:\s*"([^"]+)"/i);
        
        partialAnalysis[category.key] = {
          risk_score: normalizeBatchScores([riskScoreMatch ? parseInt(riskScoreMatch[1]) : 0])[0],
          confidence: normalizeBatchScores([confidenceMatch ? parseInt(confidenceMatch[1]) : 0])[0],
          violations: violationsMatch ? 
            violationsMatch[1].split(',').map(v => v.trim().replace(/"/g, '')).filter(v => v) : [],
          severity: (severityMatch ? severityMatch[1].toUpperCase() : 'LOW') as 'LOW' | 'MEDIUM' | 'HIGH',
          explanation: explanationMatch ? 
            explanationMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : 
            'Analysis partially extracted from malformed response'
        };
      } else {
        // No match found for this category
        partialAnalysis[category.key] = {
          risk_score: 0,
          confidence: 0,
          violations: [],
          severity: 'LOW',
          explanation: 'Category not found in response'
        };
      }
    } catch (error) {
      console.error(`Failed to extract analysis for category ${category.key}:`, error);
      partialAnalysis[category.key] = {
        risk_score: 0,
        confidence: 0,
        violations: [],
        severity: 'LOW',
        explanation: 'Failed to extract analysis for this category'
      };
    }
  }
  
  const keys = Object.keys(partialAnalysis);
  const riskScores = keys.map(key => partialAnalysis[key].risk_score);
  const confidenceScores = keys.map(key => partialAnalysis[key].confidence);
  const normalizedRiskScores = normalizeBatchScores(riskScores);
  const normalizedConfidenceScores = normalizeBatchScores(confidenceScores);
  keys.forEach((key, idx) => {
    partialAnalysis[key].risk_score = normalizedRiskScores[idx];
    partialAnalysis[key].confidence = normalizedConfidenceScores[idx];
  });
  
  return partialAnalysis;
}

// Helper: Flatten YOUTUBE_POLICY_CATEGORIES to a list of all category keys and names
function getAllPolicyCategoryKeysAndNames() {
  const keys = [];
  for (const [categoryKey, categoryName] of Object.entries(YOUTUBE_POLICY_CATEGORIES)) {
    for (const [subKey, subName] of Object.entries(categoryName)) {
      keys.push({ key: `${categoryKey}_${subKey}`, name: subName });
    }
  }
  return keys;
}

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
    console.log('Regular JSON parsing failed, trying enhanced parsing...');
    try {
      const contextData = parseJSONSafely(jsonMatch[0]);
      const validatedData = ContextAnalysisSchema.parse(contextData);
      
      return {
        content_type: validatedData.content_type || 'General',
        target_audience: validatedData.target_audience || 'General Audience',
        monetization_impact: Math.min(100, Math.max(0, validatedData.monetization_impact || 50)),
        content_length: validatedData.content_length || text.split(' ').length,
        language_detected: validatedData.language_detected || 'English'
      };
    } catch (enhancedParseError) {
      console.error('Context analysis parse error:', enhancedParseError);
      console.error('Raw JSON:', jsonMatch[0]);
      
      // Track parsing errors in Sentry
      Sentry.captureException(enhancedParseError, {
        extra: {
          rawJson: jsonMatch[0].substring(0, 500),
          function: 'performContextAnalysis'
        }
      });
      
      throw new Error('Failed to validate context analysis response');
    }
  }
}

// Stage 2: Policy Category Analysis (Batched)
async function performPolicyCategoryAnalysisBatched(text: string, model: AIModel, context: ContextAnalysis): Promise<{[key: string]: PolicyCategoryAnalysis}> {
  const policyAnalysis: {[key: string]: PolicyCategoryAnalysis} = {};
  
  const allCategoriesList = getAllPolicyCategoryKeysAndNames();
  const allCategoryKeys = allCategoriesList.map(cat => cat.key);
  
  // Process all categories in a single batch
  const batch = allCategoriesList;
  await rateLimiter.waitIfNeeded();
  
  const prompt = `
    Analyze the following content for YouTube policy compliance. For each of the following category KEYS, provide a risk score, confidence, violations, severity, and explanation. You must return a result for every key, even if the risk is 0.

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

// Stage 3: Risk Assessment
async function performRiskAssessment(text: string, model: AIModel, policyAnalysis: any, context: ContextAnalysis): Promise<any> {
  const prompt = `
    Assess the overall risk level and identify the most concerning section of the following content:

    Content: "${text}"
    Policy Analysis: ${JSON.stringify(policyAnalysis, null, 2)}
    Context: ${JSON.stringify(context, null, 2)}

    Return the overall risk score as an integer between 0 and 100. Do NOT use a 0-5 or 0-10 scale. The value must be on a 0-100 scale.

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
      
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated = SuggestionsSchema.parse(parsed);
        return validated.suggestions;
      } catch (parseError) {
        console.log('Regular JSON parsing failed, trying enhanced parsing...');
        const parsed = parseJSONSafely(jsonMatch[0]);
        const validated = SuggestionsSchema.parse(parsed);
        return validated.suggestions;
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
      const rateLimiter = new RateLimiter();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await rateLimiter.waitIfNeeded();
          
          console.log(`Attempt ${attempt}: Analyzing policy categories...`);
          
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            temperature: 0.1,
            system: `You are an expert content analyst specializing in YouTube Terms of Service compliance. Analyze the provided transcript and context to identify potential policy violations across multiple categories.

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

CRITICAL: Ensure all quotes in explanations are properly escaped. Use \\" for quotes within explanations.`,
            messages: [
              {
                role: 'user',
                content: `Analyze this YouTube video transcript for policy violations:

Context: ${context}

Transcript: ${transcript}

Provide a detailed analysis across all policy categories. Focus on identifying specific violations and providing clear explanations.`
              }
            ]
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
          }

          console.log('Raw Claude response received, attempting JSON parsing...');
          
          // Use the robust JSON parsing utility
          const parsedResult = parseJSONSafely(content.text);
          
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

// Stage 1: Content Classification
async function classifyContent(transcript: string, context: string, user: any): Promise<ContentClassification> {
  return Sentry.startSpan(
    {
      op: "ai.analysis",
      name: "Classify Content",
    },
    async () => {
      const rateLimiter = new RateLimiter();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await rateLimiter.waitIfNeeded();
          
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            temperature: 0.1,
            system: `You are an expert content classifier. Analyze the provided transcript and context to classify the content type and identify key themes.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

Response Format:
{
  "content_type": "educational|entertainment|news|tutorial|review|other",
  "primary_themes": ["theme1", "theme2", "theme3"],
  "target_audience": "general|children|teens|adults|professional",
  "content_quality": "high|medium|low",
  "engagement_level": "high|medium|low"
}`,
            messages: [
              {
                role: 'user',
                content: `Classify this YouTube video content:

Context: ${context}

Transcript: ${transcript}

Provide a detailed classification of the content type, themes, and audience.`
              }
            ]
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
          }

          const parsedResult = parseJSONSafely(content.text);
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
      const rateLimiter = new RateLimiter();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await rateLimiter.waitIfNeeded();
          
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            temperature: 0.1,
            system: `You are an expert risk assessor specializing in YouTube content compliance. Analyze the provided transcript and context to assess overall risk level.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

Response Format:
{
  "overall_risk_score": 0-100,
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "primary_concerns": ["concern1", "concern2", "concern3"],
  "compliance_status": "compliant|warning|violation",
  "recommended_actions": ["action1", "action2", "action3"]
}`,
            messages: [
              {
                role: 'user',
                content: `Assess the risk level of this YouTube video:

Context: ${context}

Transcript: ${transcript}

Provide a comprehensive risk assessment with specific concerns and recommended actions.`
              }
            ]
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
          }

          const parsedResult = parseJSONSafely(content.text);
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
      const rateLimiter = new RateLimiter();
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await rateLimiter.waitIfNeeded();
          
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            temperature: 0.1,
            system: `You are an expert confidence analyzer. Assess the confidence level of the analysis based on the quality and clarity of the provided transcript and context.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

Response Format:
{
  "overall_confidence": 0-100,
  "transcript_quality": "excellent|good|fair|poor",
  "context_clarity": "excellent|good|fair|poor",
  "analysis_reliability": "high|medium|low",
  "limitations": ["limitation1", "limitation2", "limitation3"]
}`,
            messages: [
              {
                role: 'user',
                content: `Analyze the confidence level of this analysis:

Context: ${context}

Transcript: ${transcript}

Assess the quality of the input data and the reliability of the analysis.`
              }
            ]
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
          }

          const parsedResult = parseJSONSafely(content.text);
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
      const rateLimiter = new RateLimiter();
      const maxRetries = 2;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await rateLimiter.waitIfNeeded();
          
          const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            temperature: 0.1,
            system: `You are an expert content advisor specializing in YouTube compliance. Generate actionable suggestions to improve content compliance and reduce risk.

IMPORTANT: Respond with ONLY valid JSON. No additional text or formatting.

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
}`,
            messages: [
              {
                role: 'user',
                content: `Generate suggestions for improving this YouTube video's compliance:

Context: ${context}

Transcript: ${transcript}

Provide actionable, specific suggestions to improve content compliance and reduce risk.`
              }
            ]
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Unexpected response type from Claude API');
          }

          const parsedResult = parseJSONSafely(content.text);
          const validationResult = SuggestionsSchema.safeParse(parsedResult);
          
          if (!validationResult.success) {
            throw new Error(`Invalid suggestions response: ${validationResult.error.message}`);
          }

          return validationResult.data.suggestions;

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

export interface BatchAnalysisResult {
  categories: {
    [category: string]: PolicyCategoryAnalysis;
  };
}

export interface ContentClassification {
  content_type: string;
  primary_themes: string[];
  target_audience: string;
  content_quality: string;
  engagement_level: string;
}

export interface RiskAssessment {
  overall_risk_score: number;
  flagged_section: string;
  risk_factors: string[];
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ConfidenceAnalysis {
  overall_confidence: number;
  text_clarity: number;
  policy_specificity: number;
  context_availability: number;
  confidence_factors: string[];
}

export interface Suggestion {
  title: string;
  text: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  impact_score: number;
} 
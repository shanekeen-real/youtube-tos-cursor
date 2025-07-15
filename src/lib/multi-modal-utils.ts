import { YOUTUBE_POLICY_CATEGORIES } from '../types/ai-analysis';

/**
 * Get all policy category keys from the nested YOUTUBE_POLICY_CATEGORIES object
 */
export function getAllPolicyCategoryKeys(): string[] {
  // Flatten the nested YOUTUBE_POLICY_CATEGORIES object to get all keys
  return Object.entries(YOUTUBE_POLICY_CATEGORIES)
    .flatMap(([section, cats]) => Object.keys(cats).map(key => `${section}_${key}`));
}

/**
 * Enhanced JSON parsing with multiple fallback strategies
 */
export function parseJSONWithFallbacks(response: string, expectedType: 'object' | 'array' = 'object'): any {
  console.log(`Attempting to parse JSON response (expected: ${expectedType})`);
  console.log('Response length:', response.length);
  console.log('Response preview:', response.substring(0, 200));
  
  let parsedResult: any = null;
  let jsonError = null;
  
  // Strategy 1: Direct JSON parsing
  try {
    parsedResult = JSON.parse(response);
    console.log('Direct JSON parsing succeeded');
    return parsedResult;
  } catch (e) {
    jsonError = e;
    console.log('Direct JSON parsing failed, trying extraction...');
  }
  
  // Strategy 2: Extract JSON from response
  const pattern = expectedType === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const jsonMatch = response.match(pattern);
  
  if (jsonMatch) {
    try {
      parsedResult = JSON.parse(jsonMatch[0]);
      console.log('JSON extraction succeeded');
      return parsedResult;
    } catch (e) {
      jsonError = e;
      console.log('JSON extraction failed, trying cleaning...');
    }
    
    // Strategy 3: Clean common JSON issues
    try {
      let cleaned = jsonMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/,\s*"/g, '"')
        .replace(/\\"/g, '"')
        .replace(/"/g, '\\"')
        .replace(/\\"/g, '"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      
      parsedResult = JSON.parse(cleaned);
      console.log('JSON cleaning succeeded');
      return parsedResult;
    } catch (e) {
      jsonError = e;
      console.log('JSON cleaning failed');
    }
  }
  
  console.log('All JSON parsing strategies failed');
  console.log('Final error:', jsonError);
  throw new Error(`Failed to parse JSON response: ${getErrorMessage(jsonError) || 'Unknown error'}`);
}

/**
 * Fix error property access for error.message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') return (error as any).message;
  return String(error);
}

/**
 * Shared schemas for multi-modal analysis
 */
export const MULTI_MODAL_SCHEMAS = {
  contextAnalysis: {
    content_type: "string (Educational|Entertainment|Gaming|Music|Tutorial|Review|Vlog|Other)",
    target_audience: "string (General Audience|Teens|Children|Professional|Educational|Other)",
    monetization_impact: "number (0-100)",
    content_length: "number (word count)",
    language_detected: "string (English|Spanish|French|German|Other)",
    content_quality: "string (high|medium|low)",
    engagement_level: "string (high|medium|low)",
    visual_elements: ["array of visual elements detected"],
    audio_quality: "string (high|medium|low)",
    production_value: "string (high|medium|low)",
    content_complexity: "string (simple|moderate|complex)",
    brand_safety_concerns: ["array of brand safety concerns"],
    monetization_potential: "string (high|medium|low)"
  },
  
  policyAnalysis: {
    // Object with policy category keys, each containing:
    "[CATEGORY_KEY]": {
      risk_score: "number (0-100, actual risk based on YouTube policies)",
      confidence: "number (0-100)",
      description: "string (detailed analysis of visual and audio content)",
      visual_evidence: ["list of visual elements that support this assessment"],
      audio_evidence: ["list of audio/transcript elements that support this assessment"],
      recommendations: ["list of specific recommendations for this category"]
    }
  },
  
  riskAssessment: {
    overall_risk_score: "number (0-100)",
    flagged_section: "string (most concerning part of the content)",
    risk_factors: ["list of main risk factors from visual and audio content"],
    severity_level: "string (LOW|MEDIUM|HIGH)",
    risky_phrases_by_category: "object (optional, categorized risky phrases)"
  },
  
  aiDetection: {
    ai_probability: "number (0-100)",
    confidence: "number (0-100)",
    patterns: ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected.'"],
    indicators: {
      repetitive_language: "number (0-100)",
      structured_content: "number (0-100)",
      personal_voice: "number (0-100)",
      grammar_consistency: "number (0-100)",
      natural_flow: "number (0-100)"
    },
    explanation: "string (detailed explanation of analysis)"
  },
  
  confidenceAnalysis: {
    overall_confidence: "number (0-100)",
    text_clarity: "number (0-100)",
    policy_specificity: "number (0-100)",
    context_availability: "number (0-100)",
    confidence_factors: ["array of factors contributing to confidence"]
  },
  
  suggestions: {
    title: "string (specific action to take)",
    text: "string (detailed explanation of the suggestion)",
    priority: "HIGH|MEDIUM|LOW",
    impact_score: "number (0-100)"
  }
};

/**
 * Shared example responses for multi-modal analysis
 */
export const MULTI_MODAL_EXAMPLES = {
  contextAnalysis: {
    content_type: "Vlog",
    target_audience: "General Audience",
    monetization_impact: 70,
    content_length: 5000,
    language_detected: "English",
    content_quality: "medium",
    engagement_level: "high",
    visual_elements: ["gradient overlay", "enhanced colors"],
    audio_quality: "medium",
    production_value: "low",
    content_complexity: "moderate",
    brand_safety_concerns: ["drug use", "illegal activities"],
    monetization_potential: "medium"
  },
  
  policyAnalysis: {
    CONTENT_SAFETY_VIOLENCE: {
      risk_score: 0,
      confidence: 85,
      description: "No violent content detected in visual or audio elements",
      visual_evidence: ["No violent imagery present"],
      audio_evidence: ["No violent language in transcript"],
      recommendations: ["Continue to avoid violent content"]
    },
    ADVERTISER_FRIENDLY_PROFANITY: {
      risk_score: 25,
      confidence: 70,
      description: "Mild profanity detected in transcript",
      visual_evidence: ["No profane visual content"],
      audio_evidence: ["Mild profanity in spoken content"],
      recommendations: ["Consider removing profane language"]
    }
  },
  
  riskAssessment: {
    overall_risk_score: 25,
    flagged_section: "Mild profanity detected in transcript",
    risk_factors: ["Mild profanity detected"],
    severity_level: "LOW",
    risky_phrases_by_category: {
      "ADVERTISER_FRIENDLY_PROFANITY": ["mild profanity"]
    }
  },
  
  aiDetection: {
    ai_probability: 80,
    confidence: 90,
    patterns: ["Repetitive sentence structure", "Artificial generation artifacts"],
    indicators: {
      repetitive_language: 95,
      structured_content: 85,
      personal_voice: 70,
      grammar_consistency: 90,
      natural_flow: 80
    },
    explanation: "High probability of AI generation detected, particularly in sentence structure and artificial artifacts."
  },
  
  confidenceAnalysis: {
    overall_confidence: 75,
    text_clarity: 80,
    policy_specificity: 85,
    context_availability: 90,
    confidence_factors: ["Clear content analysis", "Moderate risk factors identified"]
  },
  
  suggestions: {
    title: "Remove Profanity",
    text: "Consider removing or replacing profane language to improve advertiser-friendliness and reach a broader audience.",
    priority: "HIGH",
    impact_score: 85
  }
}; 
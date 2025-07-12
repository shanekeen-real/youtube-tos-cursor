import * as Sentry from '@sentry/nextjs';
import { PolicyCategoryAnalysis } from '../types/ai-analysis';

// Batch normalization utility for risk scores and confidence
export function normalizeBatchScores(scores: number[]) {
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
export function parseJSONSafely(jsonString: string): any {
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
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
    // Fix non-standard single quote escapes (\')
    sanitized = sanitized.replace(/\\'/g, "'");
    return JSON.parse(sanitized);
  } catch (error) {
    console.log('Simple sanitization failed, trying robust quote fixing...');
  }

  // Strategy 2.5: Robustly fix unescaped quotes in ALL string values
  try {
    let sanitized = jsonString;
    
    // Fix unescaped quotes in ALL string values, not just explanation fields
    // This regex finds any string value and escapes unescaped quotes inside it
    sanitized = sanitized.replace(
      /("(?:explanation|violations|severity|content_type|target_audience|language_detected)":\s*")((?:[^"\\]|\\.)*)"/g,
      (match, prefix, content) => {
        // Escape only unescaped quotes in the content
        const fixed = content.replace(/(?<!\\)"/g, '\\"');
        return prefix + fixed + '"';
      }
    );
    
    // Also fix trailing commas before closing braces/brackets
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
    // Fix non-standard single quote escapes (\')
    sanitized = sanitized.replace(/\\'/g, "'");
    
    return JSON.parse(sanitized);
  } catch (error) {
    console.log('Robust quote fixing failed, trying comprehensive quote fixing...');
  }

  // Strategy 2.6: Smart quote fixing that only targets string values, not keys
  try {
    let sanitized = jsonString;
    
    // Smart approach: only fix quotes in string values, not in JSON keys
    // This regex specifically targets string values after colons
    sanitized = sanitized.replace(
      /:\s*"([^"]*(?:"[^"]*)*)"/g,
      (match, content) => {
        // Only escape quotes that are not already escaped
        const fixed = content.replace(/(?<!\\)"/g, '\\"');
        return `: "${fixed}"`;
      }
    );
    
    // Also fix trailing commas before closing braces/brackets
    sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');
    // Fix non-standard single quote escapes (\')
    sanitized = sanitized.replace(/\\'/g, "'");
    
    return JSON.parse(sanitized);
  } catch (error) {
    console.log('Smart quote fixing failed, trying regex extraction...');
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
      strategiesAttempted: ['direct', 'sanitized', 'robust-quote-fixing', 'regex', 'manual']
    }
  });

  throw new Error('All JSON parsing strategies failed');
}

// Helper function to extract partial analysis from malformed JSON
export function extractPartialAnalysis(jsonString: string, batch: any[]): {[key: string]: PolicyCategoryAnalysis} {
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
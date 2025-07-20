import { PolicyCategoryAnalysis, RiskLevel, RiskAssessment } from '../types/ai-analysis';
import { AnalysisHighlight } from '../types/analysis';
import { filterFalsePositives } from './false-positive-filter';

// Type for backward compatibility with old category format
type CategoryAnalysis = PolicyCategoryAnalysis | { risk_score?: number; risk_level?: string };

// Helper function to get category score from either risk_score or risk_level
function getCategoryScore(category: CategoryAnalysis): number {
  if (category.risk_score !== undefined) {
    return category.risk_score;
  } else if ('risk_level' in category && category.risk_level) {
    const riskLevel = category.risk_level.toLowerCase();
    switch (riskLevel) {
      case 'high':
        return 80;
      case 'medium':
        return 50;
      case 'low':
        return 0; // Low risk should be 0%, not 20%
      default:
        return 0;
    }
  } else if ('severity' in category && category.severity) {
    const severity = category.severity.toLowerCase();
    switch (severity) {
      case 'high':
        return 80;
      case 'medium':
        return 50;
      case 'low':
        return 0; // Low risk should be 0%, not 20%
      default:
        return 0;
    }
  }
  return 0;
}

// Helper function to clean and validate risky phrases
export function cleanRiskyPhrases(phrases: string[]): string[] {
  if (!Array.isArray(phrases)) return [];
  
  // Use the centralized false positive filtering utility
  return filterFalsePositives(phrases);
}

// Helper functions
export function calculateOverallRiskScore(
  policyAnalysis: { [category: string]: PolicyCategoryAnalysis }, 
  riskAssessment?: RiskAssessment
): number {
  // Debug logging to understand what we're working with
  console.log('calculateOverallRiskScore input:', {
    policyAnalysisKeys: Object.keys(policyAnalysis || {}),
    policyAnalysisType: typeof policyAnalysis,
    riskAssessmentKeys: Object.keys(riskAssessment || {}),
    riskAssessmentType: typeof riskAssessment
  });
  
  // Handle empty or invalid policy analysis
  if (!policyAnalysis || typeof policyAnalysis !== 'object' || Object.keys(policyAnalysis).length === 0) {
    console.warn('Empty or invalid policy analysis provided to calculateOverallRiskScore');
    return 0;
  }
  // Define category weights based on YouTube policy importance
  const categoryWeights: { [key: string]: number } = {
    // High priority categories (weight: 2.0)
    'CONTENT_SAFETY_VIOLENCE': 2.0,
    'CONTENT_SAFETY_HARMFUL_CONTENT': 2.0,
    'COMMUNITY_STANDARDS_HATE_SPEECH': 2.0,
    'CONTENT_SAFETY_CHILD_SAFETY': 2.0,
    'COMMUNITY_STANDARDS_HARASSMENT': 2.0,
    
    // Medium priority categories (weight: 1.5)
    'CONTENT_SAFETY_DANGEROUS_ACTS': 1.5,
    'ADVERTISER_FRIENDLY_SEXUAL_CONTENT': 1.5,
    'LEGAL_COMPLIANCE_PRIVACY': 1.5,
    'MONETIZATION_MONETIZATION_ELIGIBILITY': 1.5,
    
    // Standard priority categories (weight: 1.0)
    'ADVERTISER_FRIENDLY_PROFANITY': 1.0,
    'ADVERTISER_FRIENDLY_CONTROVERSIAL': 1.0,
    'ADVERTISER_FRIENDLY_BRAND_SAFETY': 1.0,
    'COMMUNITY_STANDARDS_SPAM': 1.0,
    'COMMUNITY_STANDARDS_MISINFORMATION': 1.0,
    'LEGAL_COMPLIANCE_COPYRIGHT': 1.0,
    'LEGAL_COMPLIANCE_TRADEMARK': 1.0,
    'LEGAL_COMPLIANCE_LEGAL_REQUESTS': 1.0,
    'MONETIZATION_AD_POLICIES': 1.0,
    'MONETIZATION_SPONSORED_CONTENT': 1.0
  };

  // Calculate weighted average
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const [category, analysis] of Object.entries(policyAnalysis)) {
    const weight = categoryWeights[category] || 1.0; // Default weight of 1.0 for unknown categories
    
    // Handle both risk_score (numerical) and risk_level (string) formats
    let score = 0;
    if (analysis.risk_score !== undefined) {
      score = analysis.risk_score;
    } else if (analysis.severity) {
      // Convert severity strings to numerical scores
      const severity = analysis.severity.toLowerCase();
      switch (severity) {
        case 'high':
          score = 80;
          break;
        case 'medium':
          score = 50;
          break;
        case 'low':
          score = 20;
          break;
        default:
          score = 0;
      }
    }
    
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }
  
  // Calculate weighted average
  const weightedAverage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  
  // Apply severity adjustments based on risk distribution
  const highRiskCategories = Object.values(policyAnalysis).filter((cat: PolicyCategoryAnalysis) => {
    const score = getCategoryScore(cat);
    return score >= 80;
  });
  const mediumRiskCategories = Object.values(policyAnalysis).filter((cat: PolicyCategoryAnalysis) => {
    const score = getCategoryScore(cat);
    return score >= 40 && score < 80;
  });
  const lowRiskCategories = Object.values(policyAnalysis).filter((cat: PolicyCategoryAnalysis) => {
    const score = getCategoryScore(cat);
    return score >= 20 && score < 40;
  });
  
  let adjustedScore = weightedAverage;
  
  // If there are very high risk categories (80+), significant boost
  if (highRiskCategories.length > 0) {
    adjustedScore = Math.min(100, weightedAverage + 20);
  }
  // If there are multiple medium-high risk categories (40+), moderate boost
  else if (mediumRiskCategories.length >= 3) {
    adjustedScore = Math.min(100, weightedAverage + 15);
  }
  // If there are 2 medium risk categories, slight boost
  else if (mediumRiskCategories.length >= 2) {
    adjustedScore = Math.min(100, weightedAverage + 10);
  }
  // If there are multiple low-medium risk categories, small boost
  else if (lowRiskCategories.length >= 3 || mediumRiskCategories.length >= 1) {
    adjustedScore = Math.min(100, weightedAverage + 5);
  }
  
  // Additional adjustment: If the content has multiple concerning categories,
  // ensure the score reflects the cumulative risk
  const concerningCategories = Object.values(policyAnalysis).filter((cat: PolicyCategoryAnalysis) => getCategoryScore(cat) >= 30);
  if (concerningCategories.length >= 4) {
    adjustedScore = Math.min(100, Math.max(adjustedScore, 35)); // Minimum 35 if 4+ concerning categories
  } else if (concerningCategories.length >= 2) {
    adjustedScore = Math.min(100, Math.max(adjustedScore, 25)); // Minimum 25 if 2+ concerning categories
  }
  
  // Debug logging
  console.log('Risk calculation debug:', {
    weightedAverage: Math.round(weightedAverage * 100) / 100,
    highRiskCategories: highRiskCategories.length,
    mediumRiskCategories: mediumRiskCategories.length,
    lowRiskCategories: lowRiskCategories.length,
    concerningCategories: concerningCategories.length,
    adjustedScore: Math.round(adjustedScore * 100) / 100,
    finalScore: Math.round(adjustedScore)
  });
  
  return Math.round(adjustedScore);
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 25) return 'LOW';
  if (score <= 65) return 'MEDIUM';
  return 'HIGH';
}

export function generateHighlights(policyAnalysis: { [key: string]: PolicyCategoryAnalysis }): AnalysisHighlight[] {
  const highlights: AnalysisHighlight[] = [];
  
  for (const [category, analysis] of Object.entries(policyAnalysis)) {
    const score = getCategoryScore(analysis);
    if (score > 20) { // Only include significant risks
      highlights.push({
        category: category.replace(/_/g, ' '),
        risk: analysis.severity || 'LOW',
        score: score,
        confidence: analysis.confidence
      });
    }
  }
  
  // Sort by risk score descending
  highlights.sort((a, b) => b.score - a.score);
  
  return highlights.slice(0, 4); // Return top 4 highlights
} 
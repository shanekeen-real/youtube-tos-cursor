import { SmartAIModel } from './ai-models';
import { Suggestion, PolicyCategoryAnalysis, RiskAssessment } from '../types/ai-analysis';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';
import { MULTI_MODAL_SCHEMAS, MULTI_MODAL_EXAMPLES } from './multi-modal-utils';

/**
 * AI-driven suggestions using existing AI models
 */
export async function generateActionableSuggestionsWithContext(
  text: string, 
  model: SmartAIModel, 
  policyAnalysis: PolicyCategoryAnalysis[], 
  riskAssessment: RiskAssessment, 
  videoContext: string
): Promise<Suggestion[]> {
  console.log('Generating AI-driven suggestions...');
  
  const expectedSchema = MULTI_MODAL_SCHEMAS.suggestions;
  const exampleResponse = MULTI_MODAL_EXAMPLES.suggestions;
  
  const basePrompt = `Generate actionable suggestions for improving this YouTube video content based on policy violations and risk factors:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `${text ? `Content: "${text.substring(0, 1500)}${text.length > 1500 ? '...' : ''}"` : 'No content available'}\n` +
    `${videoContext ? `Additional Video Context: "${videoContext.substring(0, 500)}${videoContext.length > 500 ? '...' : ''}"` : 'No additional video context available'}\n\n` +
    `Policy Analysis:\n` +
    `${JSON.stringify(policyAnalysis)}\n\n` +
    `Risk Assessment:\n` +
    `${JSON.stringify(riskAssessment)}\n\n` +
    `Generate 5-12 specific, actionable suggestions. Each suggestion must have:\n` +
    `- A clear, actionable title\n` +
    `- Detailed explanation text\n` +
    `- Priority level (HIGH/MEDIUM/LOW)\n` +
    `- Impact score (0-100)\n\n` +
    `CRITICAL: You MUST provide at least 5 suggestions, even for safe content. If content is very safe, include tips for growth, engagement, monetization, or best practices.\n\n` +
    `Return ONLY this JSON array format:\n` +
    `${JSON.stringify(expectedSchema, null, 2)}\n\n` +
    `EXAMPLE SUGGESTIONS:\n` +
    `${JSON.stringify(exampleResponse, null, 2)}\n\n` +
    `SUGGESTION GUIDELINES:\n` +
    `- Focus on specific, implementable changes\n` +
    `- Address the highest risk categories first\n` +
    `- Provide clear, actionable advice\n` +
    `- Consider content type and audience\n` +
    `- If content is safe, suggest growth/monetization tips\n` +
    `- Each suggestion should be distinct and valuable\n` +
    `- ALWAYS provide at least 5 suggestions\n` +
    `- For low-risk content, focus on optimization and growth\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON array. Do not include any commentary, explanation, or text outside the JSON array.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<Suggestion[]>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Validate and normalize the suggestions
      const suggestions: Suggestion[] = parsingResult.data.map((s: Suggestion, index: number) => {
        // Ensure we have meaningful text
        let suggestionText = s.text || '';
        if (!suggestionText || suggestionText === 'No suggestion text provided') {
          // Generate a fallback suggestion based on the title or index
          if (s.title && s.title !== `Suggestion ${index + 1}`) {
            suggestionText = `Consider implementing the suggestion: ${s.title}. This would help improve content compliance and audience reach.`;
          } else {
            suggestionText = `Review your content for potential policy violations and consider making adjustments to improve compliance.`;
          }
        }
        
        return {
          title: s.title || `Suggestion ${index + 1}`,
          text: suggestionText,
          priority: s.priority || 'MEDIUM',
          impact_score: Math.min(100, Math.max(0, s.impact_score || 50))
        };
      });

      // Ensure minimum of 5 suggestions (same as original function)
      if (suggestions.length < 5) {
        const padCount = 5 - suggestions.length;
        console.log(`Padding suggestions with ${padCount} additional suggestions to meet minimum of 5`);
        for (let i = 0; i < padCount; i++) {
          suggestions.push({
            title: 'General Best Practice',
            text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
            priority: 'LOW',
            impact_score: 40
          });
        }
      }
      
      console.log(`AI-driven suggestions completed with ${suggestions.length} suggestions using ${parsingResult.strategy}`);
      return suggestions;
    } else {
      console.error(`Suggestions JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Suggestions JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI-driven suggestions failed:', error);
    
    // Fallback to meaningful suggestions based on analysis
    const fallbackSuggestions: Suggestion[] = [];
    
    // Add suggestions based on policy analysis
    const policyArray = Object.entries(policyAnalysis || {}).map(([category, data]) => ({ ...data, category }));
    const highRiskCategories = policyArray.filter(p => p.risk_score > 50);
    if (highRiskCategories.length > 0) {
      fallbackSuggestions.push({
        title: 'Address High-Risk Content',
        text: `Review and modify content related to ${highRiskCategories[0].category.toLowerCase().replace(/_/g, ' ')} to reduce policy violation risk.`,
        priority: 'HIGH',
        impact_score: 80
      });
    }
    
    // Add general suggestions
    fallbackSuggestions.push({
      title: 'Review Content Guidelines',
      text: 'Familiarize yourself with YouTube\'s Community Guidelines and advertiser-friendly content policies to ensure compliance.',
      priority: 'MEDIUM',
      impact_score: 60
    });
    
    fallbackSuggestions.push({
      title: 'Consider Content Context',
      text: 'Ensure your content provides appropriate context and educational value when discussing sensitive topics.',
      priority: 'MEDIUM',
      impact_score: 50
    });
    
    // Add more fallback suggestions to reach minimum of 5
    fallbackSuggestions.push({
      title: 'Optimize for Engagement',
      text: 'Consider adding interactive elements, calls-to-action, or engaging visuals to improve viewer retention and engagement.',
      priority: 'MEDIUM',
      impact_score: 45
    });
    
    fallbackSuggestions.push({
      title: 'Improve Content Quality',
      text: 'Focus on improving audio quality, visual presentation, and overall production value to enhance viewer experience.',
      priority: 'MEDIUM',
      impact_score: 40
    });
    
    fallbackSuggestions.push({
      title: 'Enhance Monetization',
      text: 'Consider adding sponsor segments, affiliate links, or other monetization strategies that align with your content.',
      priority: 'LOW',
      impact_score: 35
    });
    
    // Ensure minimum of 5 suggestions in fallback (same as original function)
    while (fallbackSuggestions.length < 5) {
      fallbackSuggestions.push({
        title: 'General Best Practice',
        text: 'Consider reviewing your content for further improvements in engagement, compliance, or monetization.',
        priority: 'LOW',
        impact_score: 40
      });
    }
    
    console.log(`Fallback suggestions generated with ${fallbackSuggestions.length} suggestions`);
    return fallbackSuggestions;
  }
} 
import { AIModel } from './ai-models';
import { ContextAnalysis, ContextAnalysisSchema } from '../types/ai-analysis';
import { jsonParsingService } from './json-parsing-service';
import * as Sentry from '@sentry/nextjs';

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

// Stage 1: Content Classification
export async function performContextAnalysis(text: string, model: AIModel): Promise<ContextAnalysis> {
  const expectedSchema = {
    content_type: "string (one of: " + CONTENT_TYPES.join(', ') + ")",
    target_audience: "string (one of: " + TARGET_AUDIENCES.join(', ') + ")",
    monetization_impact: "number (0-100, how likely this content type is to be monetized)",
    content_length: "number (word count)",
    language_detected: "string (primary language)"
  };

  const exampleResponse = {
    content_type: "Educational",
    target_audience: "General Audience",
    monetization_impact: 75,
    content_length: 1500,
    language_detected: "English"
  };

  const basePrompt = `
Analyze the following content to determine its context and characteristics:

Content: "${text}"

CRITICAL CONTENT TYPE DETECTION GUIDELINES:
- If content mentions sports, football, soccer, basketball, baseball, tennis, players, teams, matches, games, goals, scores, championships, leagues → classify as "Sports"
- If content mentions video games, gaming, gameplay, exploits, vulnerabilities, cheats, hacks, or gaming-related terms → classify as "Gaming"
- If content discusses programming, coding, software development, technical tutorials → classify as "Technology" or "Tutorial"
- If content is educational or instructional → classify as "Educational" or "Tutorial"
- If content is entertainment-focused → classify as "Entertainment"
- If content is news or current events → classify as "News"
- If content is music or audio-focused → classify as "Music"
- If content is comedy or humor-focused → classify as "Comedy"
- If content reviews products/services → classify as "Review"
- If content is personal vlog-style → classify as "Vlog"
- If content is documentary-style → classify as "Documentary"
- If content is fashion/beauty → classify as "Fashion"
- If content is cooking/food → classify as "Cooking"
- If content is travel-related → classify as "Travel"
- Only use "General" if content doesn't clearly fit any specific category

Consider:
- Content genre and style
- Target demographic
- Typical monetization success for this content type
- Language and cultural context
`;

  // Use the robust JSON parsing service
  const robustPrompt = jsonParsingService.createRobustPrompt(
    basePrompt,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );

  try {
    const result = await model.generateContent(robustPrompt);
    
    // Use the comprehensive JSON parsing service
    const parsingResult = await jsonParsingService.parseJson<ContextAnalysis>(
      result,
      expectedSchema,
      model
    );

    if (parsingResult.success && parsingResult.data) {
      // Validate the parsed result
      const validationResult = ContextAnalysisSchema.safeParse(parsingResult.data);
      if (validationResult.success) {
        console.log(`Context analysis successful using strategy: ${parsingResult.strategy}`);
        return {
          content_type: validationResult.data.content_type || 'General',
          target_audience: validationResult.data.target_audience || 'General Audience',
          monetization_impact: Math.min(100, Math.max(0, validationResult.data.monetization_impact || 50)),
          content_length: validationResult.data.content_length || text.split(' ').length,
          language_detected: validationResult.data.language_detected || 'English'
        };
      } else {
        console.error('Context analysis validation failed:', validationResult.error);
        throw new Error('Invalid context analysis response structure');
      }
    } else {
      // If parsing failed, try extraction from narrative
      console.log('JSON parsing failed, attempting narrative extraction...');
      const extractionRules = [
        'Identify the primary content type from the text',
        'Determine the target audience',
        'Assess monetization potential (0-100)',
        'Count approximate word count',
        'Detect the primary language'
      ];

      const extractionResult = await jsonParsingService.extractFromNarrative<ContextAnalysis>(
        result,
        expectedSchema,
        extractionRules,
        model
      );

      if (extractionResult.success && extractionResult.data) {
        const validationResult = ContextAnalysisSchema.safeParse(extractionResult.data);
        if (validationResult.success) {
          console.log(`Context analysis successful using extraction strategy: ${extractionResult.strategy}`);
          return {
            content_type: validationResult.data.content_type || 'General',
            target_audience: validationResult.data.target_audience || 'General Audience',
            monetization_impact: Math.min(100, Math.max(0, validationResult.data.monetization_impact || 50)),
            content_length: validationResult.data.content_length || text.split(' ').length,
            language_detected: validationResult.data.language_detected || 'English'
          };
        }
      }

      // Final fallback
      throw new Error(`Context analysis failed after ${parsingResult.attempts} attempts: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('Context analysis failed:', error);
    Sentry.captureException(error, {
      extra: {
        function: 'performContextAnalysis',
        textLength: text.length,
        modelName: model.name
      }
    });

    // Return a safe fallback
    return {
      content_type: 'General',
      target_audience: 'General Audience',
      monetization_impact: 50,
      content_length: text.split(' ').length,
      language_detected: 'English'
    };
  }
} 
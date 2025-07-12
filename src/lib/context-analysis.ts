import { AIModel, callAIWithRetry } from './ai-models';
import { parseJSONSafely } from './json-utils';
import { ContextAnalysis, ContextAnalysisSchema } from '../types/ai-analysis';
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
  const prompt = `
    IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.

    CRITICAL JSON FORMATTING RULES:
    - All string values MUST escape any double quotes inside them as \\".
    - Do NOT use unescaped double quotes inside any string value.
    - Do NOT include comments or extra text—output ONLY valid JSON.
    - Example: "content_type": "This is a string with an escaped quote: \\\"example\\\"."
    - If a string contains a newline, escape it as \\n.

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

    AGAIN: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
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
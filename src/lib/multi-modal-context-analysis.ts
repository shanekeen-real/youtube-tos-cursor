import { SmartAIModel } from './ai-models';
import { ContextAnalysis, ContextAnalysisSchema } from '../types/ai-analysis';
import { VideoAnalysisData } from '../types/video-processing';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';
import { performContextAnalysis } from './context-analysis';
import { MULTI_MODAL_SCHEMAS, MULTI_MODAL_EXAMPLES } from './multi-modal-utils';

/**
 * Extended context analysis interface that matches the multi-modal schema
 */
interface ExtendedContextAnalysis {
  content_type: string;
  target_audience: string;
  monetization_impact: number;
  content_length: number;
  language_detected: string;
  content_quality: string;
  engagement_level: string;
  visual_elements: string[];
  audio_quality: string;
  production_value: string;
  content_complexity: string;
  brand_safety_concerns: string[];
  monetization_potential: string;
}

/**
 * Multi-modal context analysis
 */
export async function performMultiModalContextAnalysis(
  videoData: VideoAnalysisData, 
  model: SmartAIModel, 
  videoContext: string
): Promise<ContextAnalysis> {
  const expectedSchema = MULTI_MODAL_SCHEMAS.contextAnalysis;
  const exampleResponse = MULTI_MODAL_EXAMPLES.contextAnalysis;
  
  const basePrompt = `Analyze this video content and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `Video Content: ${videoData.videoPath ? 'Video file available for analysis' : 'No video file'}\n` +
    `${videoData.transcript ? `Transcript: "${videoData.transcript}"` : 'No transcript available'}\n` +
    `${videoData.metadata ? `Metadata: ${JSON.stringify(videoData.metadata)}` : ''}\n` +
    `Context from Gemini: ${videoContext ? 'Available' : 'Not available'}`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  
  try {
    const result = await model.generateMultiModalContent!(
      robustPrompt,
      videoData.videoPath,
      videoData.transcript,
      videoData.metadata
    );
    const parsingResult = await jsonParsingService.parseJson<ExtendedContextAnalysis>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      console.log(`Multi-modal context analysis completed using ${parsingResult.strategy}`);
      // Handle case where AI returns array instead of object
      let dataToValidate = parsingResult.data;
      if (Array.isArray(parsingResult.data)) {
        console.warn('AI returned array instead of object, attempting to convert');
        // Try to extract object from array or use first item
        dataToValidate = parsingResult.data[0] || {};
      }
      
      // Convert extended context analysis to basic ContextAnalysis
      const basicContextAnalysis: ContextAnalysis = {
        content_type: dataToValidate.content_type || 'Other',
        target_audience: dataToValidate.target_audience || 'General Audience',
        monetization_impact: Math.min(100, Math.max(0, dataToValidate.monetization_impact || 50)),
        content_length: dataToValidate.content_length || 0,
        language_detected: dataToValidate.language_detected || 'English'
      };
      
      const validationResult = ContextAnalysisSchema.safeParse(basicContextAnalysis);
      if (validationResult.success) {
        return validationResult.data;
      } else {
        console.error('Context analysis validation failed:', validationResult.error);
        // Return fallback instead of throwing error
        console.log('Using fallback context analysis due to validation failure');
        const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
        return await performContextAnalysis(fallbackText, model);
      }
    } else {
      console.error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    // Fallback to text-only context analysis with video context
    const fallbackText = videoData.transcript || videoContext || 'No content available for analysis';
    return await performContextAnalysis(fallbackText, model);
  }
}

/**
 * Parse plain text response to structured context analysis
 */
export async function performAIDrivenContextAnalysis(text: string, model: SmartAIModel): Promise<ContextAnalysis> {
  console.log('Performing AI-driven context analysis...');
  
  const expectedSchema = MULTI_MODAL_SCHEMAS.contextAnalysis;
  const exampleResponse = MULTI_MODAL_EXAMPLES.contextAnalysis;
  
  const basePrompt = `Analyze this content and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- Content Type: Determine the primary genre/category of the content\n` +
    `- Target Audience: Identify the intended demographic\n` +
    `- Monetization Impact: Score 0-100 based on advertiser-friendliness and revenue potential\n` +
    `- Content Quality: Assess production value and polish\n` +
    `- Engagement Level: Estimate viewer engagement potential\n` +
    `- Visual Elements: Identify visual components mentioned or implied\n` +
    `- Audio Quality: Assess audio production value\n` +
    `- Production Value: Overall production quality assessment\n` +
    `- Content Complexity: Evaluate sophistication and depth\n` +
    `- Brand Safety: Identify potential brand safety concerns\n` +
    `- Monetization Potential: Estimate revenue generation capability\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<ExtendedContextAnalysis>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Convert extended context analysis to basic ContextAnalysis
      const validatedResult: ContextAnalysis = {
        content_type: parsingResult.data.content_type || 'Other',
        target_audience: parsingResult.data.target_audience || 'General Audience',
        monetization_impact: Math.min(100, Math.max(0, parsingResult.data.monetization_impact || 50)),
        content_length: parsingResult.data.content_length || text.split(' ').length,
        language_detected: parsingResult.data.language_detected || 'English'
      };

      console.log(`AI-driven context analysis completed using ${parsingResult.strategy}:`, validatedResult);
      return validatedResult;
    } else {
      console.error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`Context analysis JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI-driven context analysis failed:', error);
    
    // Fallback to default context analysis
    return {
      content_type: 'Other',
      target_audience: 'General Audience',
      monetization_impact: 50,
      content_length: text.split(' ').length,
      language_detected: 'English'
    };
  }
} 
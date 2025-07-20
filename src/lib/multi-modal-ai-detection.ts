import { SmartAIModel } from './ai-models';
import { ContextAnalysis } from '../types/ai-analysis';
import { VideoAnalysisData } from '@/types/video-processing';
import { ChannelContext } from '@/types/user';
import { AIDetectionResult } from '@/types/analysis';
import { jsonParsingService } from './json-parsing-service';
import { createJsonOnlyPrompt } from './prompt-utils';
import { performAIDetection } from './ai-detection';
import { MULTI_MODAL_SCHEMAS, MULTI_MODAL_EXAMPLES } from './multi-modal-utils';

/**
 * Multi-modal AI detection using multi-modal content
 */
export async function performMultiModalAIDetection(
  videoData: VideoAnalysisData,
  model: SmartAIModel,
  channelContext: ChannelContext,
  contextAnalysis: ContextAnalysis
): Promise<AIDetectionResult> {
  console.log('Starting multi-modal AI detection...');
  console.log('Channel context available:', !!channelContext);
  console.log('Context analysis:', contextAnalysis);
  
  const expectedSchema = MULTI_MODAL_SCHEMAS.aiDetection;
  const exampleResponse = MULTI_MODAL_EXAMPLES.aiDetection;
  
  const basePrompt = `Analyze this video content for AI generation patterns and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `- Video: ${videoData.videoPath ? 'Available (visual content)' : 'Not available'}\n` +
    `- Transcript: ${videoData.transcript ? 'Available' : 'Not available'}\n` +
    `- Metadata: ${videoData.metadata ? JSON.stringify(videoData.metadata).substring(0, 200) + '...' : 'Not available'}\n` +
    `- Channel Context: ${channelContext ? 'Available' : 'Not available'}\n` +
    `- Context Analysis: ${JSON.stringify(contextAnalysis).substring(0, 200)}...\n\n` +
    `ANALYSIS REQUIREMENTS:\n` +
    `1. VISUAL ANALYSIS: Production quality, editing style, visual consistency, design elements, screen recording quality, human interaction patterns\n` +
    `2. CONTENT TYPE CONSIDERATIONS: Portfolio/Design work (typically human), Professional content (can be well-produced but still human), Educational content (often structured but authentically human)\n` +
    `3. AI PATTERN DETECTION: Only include actual AI generation patterns like repetitive visual patterns, artificial generation artifacts, machine learning outputs, synthetic characteristics\n` +
    `4. HUMAN INDICATORS: Do NOT include in patterns array - personal design style, original artwork, natural visual elements, professional brand design work, conceptual projects\n\n` +
    `CRITICAL: The "patterns" array should ONLY contain actual AI generation patterns. If no AI patterns are detected, use "No specific AI patterns detected." Do NOT include human content indicators in the patterns array.\n\n` +
    `CRITICAL: Output ONLY the JSON object above. Nothing else.`,
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
    const parsingResult = await jsonParsingService.parseJson<AIDetectionResult>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Normalize the result to match AIDetectionResult interface
      const normalizedResult: AIDetectionResult = {
        probability: parsingResult.data.probability || 0,
        confidence: parsingResult.data.confidence || 0,
        patterns: Array.isArray(parsingResult.data.patterns) ? parsingResult.data.patterns : ['No specific AI patterns detected.'],
        indicators: {
          repetitive_language: parsingResult.data.indicators?.repetitive_language || 0,
          structured_content: parsingResult.data.indicators?.structured_content || 0,
          personal_voice: parsingResult.data.indicators?.personal_voice || 0,
          grammar_consistency: parsingResult.data.indicators?.grammar_consistency || 0,
          natural_flow: parsingResult.data.indicators?.natural_flow || 0
        },
        explanation: parsingResult.data.explanation || 'AI detection analysis completed'
      };
      console.log(`Multi-modal AI detection completed successfully using ${parsingResult.strategy}:`, normalizedResult);
      return normalizedResult;
    } else {
      console.error(`AI detection JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`AI detection JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('Multi-modal AI detection failed:', error);
    // Fallback to text-only AI detection
    if (videoData.transcript) {
      console.log('Falling back to transcript-based AI detection');
      const fallbackResult = await performAIDetection(videoData.transcript, model, channelContext);
      // Convert to AIDetectionResult format
      return {
        probability: fallbackResult.ai_probability,
        confidence: fallbackResult.confidence,
        patterns: fallbackResult.patterns,
        indicators: fallbackResult.indicators,
        explanation: fallbackResult.explanation
      };
    }
    throw error;
  }
}

/**
 * AI-driven AI detection using existing AI models
 */
export async function performAIDrivenAIDetection(text: string, model: SmartAIModel): Promise<AIDetectionResult> {
  console.log('Performing AI-driven AI detection...');
  
  const expectedSchema = MULTI_MODAL_SCHEMAS.aiDetection;
  const exampleResponse = MULTI_MODAL_EXAMPLES.aiDetection;
  
  const basePrompt = `Analyze this content for AI generation patterns and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- Be VERY conservative in AI detection - only flag content with CLEAR, OBVIOUS AI generation patterns\n` +
    `- Consider content type and context when assessing AI probability\n` +
    `- Structured content (tutorials, educational) is normal and doesn't indicate AI generation\n` +
    `- Professional content can be well-produced but still human-created\n` +
    `- Personal elements strongly indicate human content\n` +
    `- Visual elements and screen recordings indicate human interaction\n` +
    `- Brand references in design work are normal for human designers\n` +
    `- Gaming content can have structure but is often human-created\n` +
    `- Conceptual content (alcohol-related design work) is typical of human designers\n\n` +
    `ONLY flag as AI-generated if you detect MULTIPLE of these CLEAR indicators:\n` +
    `1. Unnaturally perfect grammar with ZERO errors in casual speech\n` +
    `2. Complete absence of personal pronouns (I, me, my, we, our) in personal content\n` +
    `3. Overly formal academic tone in casual/entertainment content\n` +
    `4. Exact repetitive sentence structures (not just similar topics)\n` +
    `5. Complete lack of current slang, cultural references, or timely mentions\n` +
    `6. Unnatural topic transitions that don't follow human thought patterns\n` +
    `7. Perfect spelling with no typos in conversational content\n` +
    `8. Template-like structure that's too rigid for human storytelling\n\n` +
    `DO NOT flag for:\n` +
    `- Structured narratives (normal for storytelling)\n` +
    `- Repetitive terminology (normal for specialized content)\n` +
    `- Consistent grammar (normal for professional content)\n` +
    `- Template intros/outros (standard YouTube format)\n` +
    `- Personal anecdotes (indicates human content)\n` +
    `- Natural speech patterns with minor errors\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  
  try {
    const result = await model.generateContent(robustPrompt);
    const parsingResult = await jsonParsingService.parseJson<AIDetectionResult>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Validate and normalize the result
      const validatedResult: AIDetectionResult = {
        probability: Math.min(100, Math.max(0, parsingResult.data.probability || 0)),
        confidence: Math.min(100, Math.max(0, parsingResult.data.confidence || 0)),
        patterns: Array.isArray(parsingResult.data.patterns) ? parsingResult.data.patterns : ['No specific AI patterns detected.'],
        indicators: {
          repetitive_language: Math.min(100, Math.max(0, parsingResult.data.indicators?.repetitive_language || 0)),
          structured_content: Math.min(100, Math.max(0, parsingResult.data.indicators?.structured_content || 0)),
          personal_voice: Math.min(100, Math.max(0, parsingResult.data.indicators?.personal_voice || 0)),
          grammar_consistency: Math.min(100, Math.max(0, parsingResult.data.indicators?.grammar_consistency || 0)),
          natural_flow: Math.min(100, Math.max(0, parsingResult.data.indicators?.natural_flow || 0))
        },
        explanation: parsingResult.data.explanation || 'AI detection analysis completed'
      };

      console.log(`AI-driven AI detection completed using ${parsingResult.strategy}:`, validatedResult);
      return validatedResult;
    } else {
      console.error(`AI detection JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`AI detection JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI-driven AI detection failed:', error);
    
    // Fallback to minimal AI detection
    return {
      probability: 0,
      confidence: 0,
      patterns: ['No specific AI patterns detected.'],
      indicators: {
        repetitive_language: 0,
        structured_content: 0,
        personal_voice: 0,
        grammar_consistency: 0,
        natural_flow: 0
      },
      explanation: 'AI detection analysis failed - defaulting to 0%'
    };
  }
}

/**
 * AI detection with video context from Gemini
 */
export async function performAIDetectionWithContext(
  transcript: string, 
  model: SmartAIModel, 
  channelContext: ChannelContext, 
  videoContext: string
): Promise<AIDetectionResult> {
  console.log('Performing AI detection with video context...');
  
  const expectedSchema = {
    probability: "number (0-100)",
    confidence: "number (0-100)",
    patterns: ["array of actual AI generation patterns - if none detected, use 'No specific AI patterns detected'"],
    indicators: {
      repetitive_language: "number (0-100)",
      structured_content: "number (0-100)",
      personal_voice: "number (0-100)",
      grammar_consistency: "number (0-100)",
      natural_flow: "number (0-100)"
    },
    explanation: "string explaining the analysis"
  };
  const exampleResponse = {
    probability: 80,
    confidence: 90,
    patterns: ["Repetitive sentence structure", "Artificial generation artifacts"],
    indicators: {
      repetitive_language: 85,
      structured_content: 70,
      personal_voice: 20,
      grammar_consistency: 95,
      natural_flow: 30
    },
    explanation: "High probability of AI generation detected, particularly in sentence structure and artificial artifacts."
  };
  const basePrompt = `Analyze this content for AI generation patterns and return ONLY this JSON structure:`;
  const robustPrompt = createJsonOnlyPrompt(
    basePrompt + '\n' +
    `CONTENT TO ANALYZE:\n` +
    `"${transcript.substring(0, 2000)}${transcript.length > 2000 ? '...' : ''}"\n\n` +
    `VIDEO CONTEXT (from Gemini visual analysis):\n` +
    `${videoContext}\n\n` +
    `CHANNEL CONTEXT:\n` +
    `${JSON.stringify(channelContext)}\n\n` +
    `ANALYSIS GUIDELINES:\n` +
    `- Probability: Likelihood that this content was AI-generated (0-100)\n` +
    `- Confidence: Confidence in the AI detection assessment (0-100)\n` +
    `- Patterns: Specific patterns that indicate AI generation\n` +
    `- Indicators: Detailed scoring of various AI indicators\n` +
    `- Explanation: Clear explanation of the analysis results\n\n` +
    `IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.`,
    JSON.stringify(expectedSchema, null, 2),
    JSON.stringify(exampleResponse, null, 2)
  );
  
  try {
    const result = await model.performTextAnalysisWithContext(
      robustPrompt,
      videoContext,
      transcript,
      undefined // metadata parameter - not needed for this analysis
    );
    const parsingResult = await jsonParsingService.parseJson<AIDetectionResult>(result, expectedSchema, model);
    if (parsingResult.success && parsingResult.data) {
      // Normalize the result to match AIDetectionResult interface
      const normalizedResult: AIDetectionResult = {
        probability: parsingResult.data.probability || 0,
        confidence: parsingResult.data.confidence || 0,
        patterns: Array.isArray(parsingResult.data.patterns) ? parsingResult.data.patterns : ['No specific AI patterns detected.'],
        indicators: {
          repetitive_language: parsingResult.data.indicators?.repetitive_language || 0,
          structured_content: parsingResult.data.indicators?.structured_content || 0,
          personal_voice: parsingResult.data.indicators?.personal_voice || 0,
          grammar_consistency: parsingResult.data.indicators?.grammar_consistency || 0,
          natural_flow: parsingResult.data.indicators?.natural_flow || 0
        },
        explanation: parsingResult.data.explanation || 'AI detection analysis completed'
      };
      console.log(`AI detection with context completed using ${parsingResult.strategy}:`, normalizedResult);
      return normalizedResult;
    } else {
      console.error(`AI detection JSON parsing failed: ${parsingResult.error}`);
      throw new Error(`AI detection JSON parsing failed: ${parsingResult.error}`);
    }
  } catch (error) {
    console.error('AI detection with context failed:', error);
    
    // Fallback to minimal AI detection
    return {
      probability: 0,
      confidence: 0,
      patterns: ['No specific AI patterns detected.'],
      indicators: {
        repetitive_language: 0,
        structured_content: 0,
        personal_voice: 0,
        grammar_consistency: 0,
        natural_flow: 0
      },
      explanation: 'AI detection analysis failed - defaulting to 0%'
    };
  }
} 
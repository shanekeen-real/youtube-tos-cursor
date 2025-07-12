import { AIModel, callAIWithRetry } from './ai-models';
import { parseJSONSafely } from './json-utils';
import { performContextAnalysis } from './context-analysis';

/**
 * Perform AI detection analysis using channel context and content analysis
 */
export async function performAIDetection(text: string, model: AIModel, channelContext: any): Promise<any> {
  try {
    // First, analyze the content type to adjust detection sensitivity
    const contentAnalysis = await performContextAnalysis(text, model);
    const contentType = contentAnalysis.content_type?.toLowerCase() || 'general';
    
    // Adjust AI detection sensitivity based on content type
    const contentTypeMultipliers = {
      'gaming': 0.6,        // Gaming content often has structure - be more lenient
      'vlog': 0.4,          // Vlogs are personal - very lenient
      'entertainment': 0.7, // Entertainment can be scripted - moderate leniency
      'educational': 0.8,   // Educational content is often structured - some leniency
      'tutorial': 0.8,      // Tutorials are structured - some leniency
      'review': 0.7,        // Reviews can be structured - moderate leniency
      'news': 0.9,          // News is formal - less lenient
      'general': 0.8        // Default - moderate leniency
    };
    
    const sensitivityMultiplier = contentTypeMultipliers[contentType as keyof typeof contentTypeMultipliers] || 0.8;
    
    // Adjust channel context influence based on channel age and size
    const channelAge = channelContext.channelData?.accountDate ? 
      (new Date().getTime() - new Date(channelContext.channelData.accountDate).getTime()) / (1000 * 60 * 60 * 24 * 365) : 1;
    const isEstablishedChannel = channelAge > 1 || (channelContext.channelData?.subscriberCount || 0) > 10000;
    
    const prompt = `
      Analyze this YouTube video transcript for AI generation patterns, considering the channel context and content type.
      
      Channel Context:
      - Channel Age: ${channelAge.toFixed(1)} years
      - Established Channel: ${isEstablishedChannel ? 'Yes' : 'No'}
      - Subscriber Count: ${channelContext.channelData?.subscriberCount || 0}
      - Video Count: ${channelContext.channelData?.videoCount || 0}
      - AI Probability (Channel Level): ${channelContext.aiIndicators?.aiProbability || 0}%
      
      Content Type: ${contentType}
      Content Length: ${text.length} characters
      
      Content to Analyze:
      "${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}"
      
      IMPORTANT: Be VERY conservative in AI detection. Only flag content that has CLEAR, OBVIOUS AI generation patterns. Consider these factors:
      
      CRITICAL: Ensure consistency between your AI probability score and explanation:
      - If you give a LOW probability (0-30%), your explanation should NOT suggest the content is AI-generated
      - If you give a HIGH probability (61-100%), your explanation should clearly explain why it appears AI-generated
      - Avoid mentioning concerning channel metrics (like low subscriber counts) when giving low AI probability scores
      
      EXPLANATION REQUIREMENTS:
      - Provide a detailed explanation that is AT LEAST 4 lines long
      - For LOW AI probability (0-30%): Focus on human-like characteristics and avoid mentioning specific channel metrics that might seem concerning
      - For MEDIUM AI probability (31-60%): Reference channel context moderately to explain why some structure is acceptable
      - For HIGH AI probability (61-100%): Reference channel context to explain why the patterns are unusual for this channel
      - Use specific evidence from the content analysis to support your conclusion
      - Explain how the content type affects the assessment
      
      CONTENT TYPE ADJUSTMENTS:
      - Gaming content: Allow for structured narratives, repetitive gaming terms, consistent grammar
      - Vlog content: Allow for personal storytelling, natural speech patterns, casual language
      - Educational content: Allow for structured explanations, formal language, consistent terminology
      - Entertainment content: Allow for scripted elements, professional presentation
      
      ESTABLISHED CHANNEL BENEFITS:
      - Older channels with many videos are less likely to be AI-generated
      - High subscriber counts suggest human-created content
      - Consistent upload patterns are normal for human creators
      
      ONLY flag as AI-generated if you detect MULTIPLE of these CLEAR indicators:
      1. Unnaturally perfect grammar with ZERO errors in casual speech
      2. Complete absence of personal pronouns (I, me, my, we, our) in personal content
      3. Overly formal academic tone in casual/entertainment content
      4. Exact repetitive sentence structures (not just similar topics)
      5. Complete lack of current slang, cultural references, or timely mentions
      6. Unnatural topic transitions that don't follow human thought patterns
      7. Perfect spelling with no typos in conversational content
      8. Template-like structure that's too rigid for human storytelling
      
      DO NOT flag for:
      - Structured narratives (normal for storytelling)
      - Repetitive terminology (normal for specialized content)
      - Consistent grammar (normal for professional content)
      - Template intros/outros (standard YouTube format)
      - Personal anecdotes (indicates human content)
      - Natural speech patterns with minor errors
      
      EXPLANATION FORMAT EXAMPLES:
      
      For LOW AI probability (0-30%):
      "This content appears to be naturally human-generated, with authentic voice patterns that align with the channel's established history. The content demonstrates natural speech patterns, personal anecdotes, and conversational flow that are consistent with human storytelling. The [CONTENT_TYPE] content type allows for structured presentation while maintaining authentic voice, and the analysis found strong indicators of personal voice and natural flow. The channel's characteristics support this assessment, indicating content created through natural human processes."
      
      For MEDIUM AI probability (31-60%):
      "This content shows some structured elements that could indicate AI assistance, but the analysis considers the channel's context. The [CONTENT_TYPE] content type naturally involves some structure, and the channel's characteristics suggest this is an established creator who may use tools to enhance content quality. However, the content maintains personal voice elements and natural transitions that indicate human oversight and creative input."
      
      For HIGH AI probability (61-100%):
      "This content displays clear AI generation patterns that are unusual for this channel's typical content. The analysis detected multiple distinct AI patterns, including overly perfect grammar and structured content that exceeds normal human consistency. The content shows characteristics inconsistent with human-created material, suggesting significant AI assistance in the creation process."
      
      Return analysis in JSON format:
      {
        "ai_probability": "number (0-100, overall AI generation probability)",
        "confidence": "number (0-100, confidence in this assessment)",
        "patterns": ["pattern1", "pattern2", "pattern3"],
        "indicators": {
          "repetitive_language": "number (0-100)",
          "structured_content": "number (0-100)",
          "personal_voice": "number (0-100, low = AI indicator)",
          "grammar_consistency": "number (0-100, perfect = AI indicator)",
          "natural_flow": "number (0-100, low = AI indicator)"
        },
        "explanation": "string (detailed 4+ line explanation referencing channel context and evidence)",
        "content_type_adjustment": "string (how content type affected detection)"
      }
      
      IMPORTANT: Respond ONLY with valid JSON. Do not include any commentary, explanation, or text outside the JSON object.
    `;

    const result = await callAIWithRetry((model: AIModel) => model.generateContent(prompt));
    const response = result;
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI detection response');
    }
    
    try {
      const aiData = JSON.parse(jsonMatch[0]);
      
      // Apply content-type sensitivity adjustment
      let adjustedProbability = Math.min(100, Math.max(0, aiData.ai_probability || 0));
      adjustedProbability = adjustedProbability * sensitivityMultiplier;
      
      // Apply established channel bonus (reduce AI probability for established channels)
      if (isEstablishedChannel) {
        adjustedProbability = adjustedProbability * 0.7; // 30% reduction for established channels
      }
      
      // Enhance explanation with actual channel context values
      let enhancedExplanation = aiData.explanation || 'AI detection analysis completed';
      
      // Smart threshold system for mentioning numbers
      const subscriberCount = channelContext.channelData?.subscriberCount || 0;
      const videoCount = channelContext.channelData?.videoCount || 0;
      const channelAiProbability = channelContext.aiIndicators?.aiProbability || 0;
      
      // Only mention subscriber count if it's substantial (1000+) OR if AI probability is high (to explain context)
      const subscriberText = (subscriberCount >= 1000 || adjustedProbability > 60) 
        ? subscriberCount.toLocaleString() 
        : 'established following';
      
      // Only mention video count if it's substantial (50+) OR if AI probability is high
      const videoText = (videoCount >= 50 || adjustedProbability > 60) 
        ? videoCount.toLocaleString() 
        : 'consistent content creation';
      
      // Only mention channel AI probability if it's notable (20%+) OR if AI probability is high
      const channelAiText = (channelAiProbability >= 20 || adjustedProbability > 60) 
        ? `${channelAiProbability}%` 
        : 'low AI usage patterns';
      
      // For low AI probability, use more generic terms to avoid confusion
      if (adjustedProbability <= 30) {
        enhancedExplanation = enhancedExplanation
          .replace(/\[CHANNEL_AGE\]/g, 'established')
          .replace(/\[SUBSCRIBER_COUNT\]/g, 'established following')
          .replace(/\[VIDEO_COUNT\]/g, 'consistent content creation')
          .replace(/\[CONTENT_TYPE\]/g, contentType)
          .replace(/\[CHANNEL_AI_PROBABILITY\]/g, 'low AI usage patterns');
      } else {
        enhancedExplanation = enhancedExplanation
          .replace(/\[CHANNEL_AGE\]/g, channelAge.toFixed(1))
          .replace(/\[SUBSCRIBER_COUNT\]/g, subscriberText)
          .replace(/\[VIDEO_COUNT\]/g, videoText)
          .replace(/\[CONTENT_TYPE\]/g, contentType)
          .replace(/\[CHANNEL_AI_PROBABILITY\]/g, channelAiText);
      }
      
      // Ensure explanation is at least 4 lines
      const explanationLines = enhancedExplanation.split('\n').filter((line: string) => line.trim().length > 0);
      if (explanationLines.length < 4) {
        // Add additional context to reach 4 lines
        const additionalContext = `The analysis considered the channel's overall content patterns and upload consistency. This assessment is based on multiple linguistic and structural indicators analyzed against the channel's established content history.`;
        enhancedExplanation = enhancedExplanation + '\n\n' + additionalContext;
      }
      
      // Validate and normalize the data
      return {
        ai_probability: Math.round(adjustedProbability),
        confidence: Math.min(100, Math.max(0, aiData.confidence || 0)),
        patterns: Array.isArray(aiData.patterns) ? aiData.patterns : [],
        indicators: {
          repetitive_language: Math.min(100, Math.max(0, aiData.indicators?.repetitive_language || 0)),
          structured_content: Math.min(100, Math.max(0, aiData.indicators?.structured_content || 0)),
          personal_voice: Math.min(100, Math.max(0, aiData.indicators?.personal_voice || 0)),
          grammar_consistency: Math.min(100, Math.max(0, aiData.indicators?.grammar_consistency || 0)),
          natural_flow: Math.min(100, Math.max(0, aiData.indicators?.natural_flow || 0)),
        },
        explanation: enhancedExplanation,
        content_type_adjustment: aiData.content_type_adjustment || `Applied ${contentType} sensitivity multiplier (${sensitivityMultiplier})`,
      };
    } catch (parseError) {
      console.error('AI detection parse error:', parseError);
      return {
        ai_probability: 0,
        confidence: 0,
        patterns: [],
        indicators: {
          repetitive_language: 0,
          structured_content: 0,
          personal_voice: 0,
          grammar_consistency: 0,
          natural_flow: 0,
        },
        explanation: 'AI detection analysis failed',
        content_type_adjustment: 'Analysis failed - defaulting to 0%',
      };
    }
  } catch (error) {
    console.error('Error performing AI detection:', error);
    return {
      ai_probability: 0,
      confidence: 0,
      patterns: [],
      indicators: {
        repetitive_language: 0,
        structured_content: 0,
        personal_voice: 0,
        grammar_consistency: 0,
        natural_flow: 0,
      },
      explanation: 'AI detection analysis failed',
      content_type_adjustment: 'Analysis failed - defaulting to 0%',
    };
  }
} 
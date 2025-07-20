import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';

export async function POST(req: NextRequest) {
  try {
    const { text, contentType, channelContext } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    // Mock channel context for testing
    const mockChannelContext = channelContext || {
      channelData: {
        channelId: 'test-channel',
        title: 'Test Channel',
        verified: false,
        subscriberCount: 50000,
        videoCount: 100,
        accountDate: '2020-01-01T00:00:00Z'
      },
      aiIndicators: {
        aiProbability: 15,
        confidence: 80,
        uploadConsistency: 0.5,
        titleVariation: 0.6,
        descriptionTemplates: 2,
        subToVideoRatio: 500,
        viewToSubRatio: 0.3,
        videosPerDay: 0.1
      }
    };

    console.log('Testing AI detection with:', {
      textLength: text.length,
      contentType: contentType || 'auto-detected',
      channelContext: mockChannelContext
    });

    // Perform analysis with AI detection
    const analysisResult = await performEnhancedAnalysis(text, mockChannelContext);

    return NextResponse.json({
      success: true,
      analysis: {
        risk_score: analysisResult.risk_score,
        risk_level: analysisResult.risk_level,
        ai_detection: analysisResult.ai_detection,
        context_analysis: analysisResult.context_analysis,
        content_type: analysisResult.context_analysis?.content_type,
        analysis_metadata: analysisResult.analysis_metadata
      },
      test_info: {
        text_length: text.length,
        content_type_provided: contentType,
        content_type_detected: analysisResult.context_analysis?.content_type,
        channel_context_used: mockChannelContext
      }
    });

  } catch (error: unknown) {
    console.error('AI detection test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to test AI detection',
      details: errorMessage 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Detection Test Endpoint',
    usage: 'POST with { text: "content to analyze", contentType: "optional", channelContext: "optional" }',
    examples: [
      {
        name: 'Gaming Content',
        text: 'Hey guys, today I\'m playing this amazing new game and I had this crazy experience where I was exploring the map and found this hidden area. It was absolutely insane! I couldn\'t believe what I discovered there.',
        contentType: 'gaming'
      },
      {
        name: 'Personal Vlog',
        text: 'So today I wanted to share something really personal with you all. I\'ve been going through some stuff lately and I thought it would be good to talk about it. You know, sometimes life just throws you curveballs.',
        contentType: 'vlog'
      },
      {
        name: 'Educational Content',
        text: 'In this tutorial, we will explore the fundamental principles of machine learning algorithms. We will cover three main categories: supervised learning, unsupervised learning, and reinforcement learning.',
        contentType: 'educational'
      }
    ]
  });
} 
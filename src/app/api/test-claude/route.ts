import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    
    if (!text) {
      return NextResponse.json({ 
        error: 'No text provided',
        usage: 'Send POST request with { "text": "your content to analyze" }'
      });
    }

    console.log('Testing Claude integration with text:', text.substring(0, 100) + '...');
    
    // Test the enhanced analysis with our new model abstraction
    const result = await performEnhancedAnalysis(text);
    
    return NextResponse.json({
      message: 'Claude integration test successful',
      model_used: result.analysis_metadata.model_used,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      confidence_score: result.confidence_score,
      processing_time_ms: result.analysis_metadata.processing_time_ms,
      content_length: result.analysis_metadata.content_length,
      highlights: result.highlights,
      suggestions: result.suggestions,
      test_text: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    });

  } catch (error) {
    console.error('Claude integration test failed:', error);
    return NextResponse.json({ 
      error: 'Claude integration test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      anthropic_key_present: !!process.env.ANTHROPIC_API_KEY,
      google_key_present: !!process.env.GOOGLE_API_KEY
    });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Claude integration test endpoint ready',
    anthropic_key_present: !!process.env.ANTHROPIC_API_KEY,
    google_key_present: !!process.env.GOOGLE_API_KEY,
    usage: 'Send POST request with { "text": "your content to analyze" }',
    models: {
      primary: 'claude-3-haiku-20240307 (if ANTHROPIC_API_KEY is set)',
      fallback: 'gemini-1.5-flash-latest (if Claude unavailable)'
    }
  });
} 
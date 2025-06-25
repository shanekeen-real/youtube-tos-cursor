import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    
    const analysisResult = await performEnhancedAnalysis(text);

    return NextResponse.json({
      ...analysisResult,
      mode: 'enhanced',
      source: 'gemini-1.5-flash-latest'
    });

  } catch (error) {
    console.error('Enhanced Analysis API error:', error);
    
    // Track API errors with Sentry
    Sentry.captureException(error, {
      tags: { component: 'api', endpoint: 'analyze-policy' },
      extra: { 
        hasText: !!req.body,
        userAgent: req.headers.get('user-agent')
      }
    });
    
    return NextResponse.json({
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'An unknown error occurred.'
    }, { status: 500 });
  }
} 
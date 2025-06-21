import { NextRequest, NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/ai-analysis';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    
    const analysisResult = await performAnalysis(text);

    return NextResponse.json({
      ...analysisResult,
      mode: 'free',
      source: 'gemini-pro'
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json({
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'An unknown error occurred.'
    }, { status: 500 });
  }
} 
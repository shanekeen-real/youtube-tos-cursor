import { NextRequest, NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/ai-analysis';
import ytdl from 'ytdl-core';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !ytdl.validateURL(url)) {
      return NextResponse.json({ error: 'A valid YouTube URL is required' }, { status: 400 });
    }
    
    // Fetch video info from YouTube
    const videoInfo = await ytdl.getInfo(url);
    const { title, description } = videoInfo.videoDetails;

    // Combine the title and description to create the content for analysis
    const contentToAnalyze = `Video Title: ${title}\n\nVideo Description:\n${description}`;

    const analysisResult = await performAnalysis(contentToAnalyze);

    return NextResponse.json({
      ...analysisResult,
      mode: 'pro', // URL analysis can be a "pro" feature
      source: 'ytdl-gemini-pro'
    });

  } catch (error) {
    console.error('URL Analysis API error:', error);
    let errorMessage = 'AI analysis for the URL failed.';
    if (error instanceof Error && error.message.includes('No such video')) {
        errorMessage = 'Could not find a YouTube video at the provided URL.';
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'An unknown error occurred.'
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/ai-analysis';

// Function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*&v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Function to validate YouTube URL
function isValidYouTubeUrl(url: string): boolean {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json({ error: 'A valid YouTube URL is required' }, { status: 400 });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    // For now, we'll analyze the URL itself and provide guidance
    // In a production environment, you might want to use YouTube Data API v3
    const contentToAnalyze = `YouTube Video Analysis Request:
    
Video URL: ${url}
Video ID: ${videoId}

Please analyze this YouTube video URL and provide guidance on potential content risks. Since we cannot directly access the video content in this serverless environment, please provide general guidance for YouTube content creators on:

1. Common YouTube policy violations to watch out for
2. Best practices for maintaining advertiser-friendly content
3. General risk assessment for YouTube video content
4. Recommendations for content creators to avoid demonetization

Focus on providing actionable advice that would be relevant for any YouTube content creator.`;

    const analysisResult = await performAnalysis(contentToAnalyze);

    return NextResponse.json({
      ...analysisResult,
      mode: 'pro',
      source: 'youtube-url-analysis',
      videoId: videoId,
      note: 'Analysis based on general YouTube guidelines. For detailed video-specific analysis, consider using YouTube Data API v3.'
    });

  } catch (error) {
    console.error('URL Analysis API error:', error);
    let errorMessage = 'AI analysis for the URL failed.';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return NextResponse.json({
      error: errorMessage,
      details: error instanceof Error ? error.message : 'An unknown error occurred.'
    }, { status: 500 });
  }
} 
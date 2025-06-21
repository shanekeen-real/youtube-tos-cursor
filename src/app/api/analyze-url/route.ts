import { NextRequest, NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/ai-analysis';
import { YoutubeTranscript } from 'youtube-transcript';

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

    // --- New: Fetch Transcript ---
    let transcript = '';
    let transcriptError = null;
    try {
      const transcriptParts = await YoutubeTranscript.fetchTranscript(url);
      transcript = transcriptParts.map(part => part.text).join(' ');
    } catch (error) {
      transcriptError = "Transcript not available for this video.";
      console.log(`Transcript fetch error for ${url}:`, error);
    }

    // --- Enhanced Content for Analysis ---
    // Now we send the transcript to the AI for a much more accurate analysis.
    const contentToAnalyze = `
      YouTube Video Analysis Request:
      
      Video URL: ${url}
      Video ID: ${videoId}
      
      Transcript:
      ---
      ${transcript || transcriptError || 'No transcript provided.'}
      ---
      
      Please analyze the provided video transcript for potential violations of YouTube's policies.
    `;

    const analysisResult = await performAnalysis(contentToAnalyze);

    // --- Return both analysis and the transcript ---
    return NextResponse.json({
      ...analysisResult,
      transcript: transcript || transcriptError, // Send transcript or error message to frontend
      mode: 'pro',
      source: 'youtube-url-analysis',
      videoId: videoId,
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
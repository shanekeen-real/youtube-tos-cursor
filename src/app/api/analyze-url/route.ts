import { NextRequest, NextResponse } from 'next/server';
import { performAnalysis } from '@/lib/ai-analysis';
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';

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

    let contentToAnalyze = '';
    let analyzedContent = '';
    let analysisSource = ''; // 'transcript' or 'metadata'

    try {
      // 1. First, try to get the transcript
      const transcriptParts = await YoutubeTranscript.fetchTranscript(url);
      analyzedContent = transcriptParts.map(part => part.text).join(' ');
      contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
      analysisSource = 'transcript';
    } catch (error) {
      // 2. If transcript fails, fall back to YouTube Data API
      console.log(`Transcript failed, falling back to YouTube Data API for video ${videoId}`);
      try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
          throw new Error("YouTube API key is not configured.");
        }
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;
        const response = await axios.get(apiUrl);
        
        const video = response.data.items[0];
        if (!video) {
          throw new Error("Video not found via YouTube API.");
        }
        
        const { title, description } = video.snippet;
        analyzedContent = `Title: ${title}\n\nDescription:\n${description}`;
        contentToAnalyze = `Analyze the following YouTube video title and description: \n\n---${analyzedContent}---`;
        analysisSource = 'metadata';

      } catch (apiError: any) {
        console.error('YouTube Data API fetch failed:', apiError.message);
        // Final fallback if both transcript and API fail
        return NextResponse.json({ 
          error: "Could not retrieve transcript or video metadata. Please try another video.",
          details: apiError.message 
        }, { status: 500 });
      }
    }

    const analysisResult = await performAnalysis(contentToAnalyze);

    return NextResponse.json({
      ...analysisResult,
      analyzed_content: analyzedContent,
      analysis_source: analysisSource,
      mode: 'pro',
      videoId: videoId,
    });

  } catch (error: any) {
    console.error('Unhandled URL Analysis API error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred during analysis.',
      details: error.message
    }, { status: 500 });
  }
} 
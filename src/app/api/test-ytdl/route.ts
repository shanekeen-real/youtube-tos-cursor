import { NextRequest, NextResponse } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';

// Extract YouTube video ID from URL
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

// Extract transcript using youtube-transcript library
async function fetchTranscript(videoId: string): Promise<{ transcript: string | null, error?: string }> {
  try {
    console.log(`Attempting to fetch transcript for video ${videoId} using youtube-transcript library...`);
    
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      // Combine all transcript items into a single text
      const transcriptText = transcriptItems
        .map(item => item.text)
        .join(' ');
      
      console.log(`Successfully extracted transcript: ${transcriptText.length} characters`);
      return { transcript: transcriptText };
    } else {
      console.log(`No transcript items found for video ${videoId}`);
      return { transcript: null, error: 'No transcript available for this video' };
    }
  } catch (error: any) {
    console.error(`Transcript extraction failed:`, error.message);
    return { transcript: null, error: error.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }

    console.log(`Processing video ID: ${videoId}`);

    // Extract transcript using youtube-transcript library
    const { transcript, error } = await fetchTranscript(videoId);

    if (transcript) {
      return NextResponse.json({
        success: true,
        videoId,
        hasTranscript: true,
        transcriptLength: transcript.length,
        transcriptPreview: transcript.substring(0, 500) + (transcript.length > 500 ? '...' : ''),
        source: 'youtube-transcript library',
        debug: {
          note: 'Transcript found using youtube-transcript library'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        videoId,
        hasTranscript: false,
        transcriptLength: 0,
        transcriptPreview: null,
        debug: {
          note: error || 'Transcript not found or extraction failed.'
        }
      }, { status: 404 });
    }
  } catch (error: any) {
    console.error('Test endpoint failed:', error);
    return NextResponse.json({
      error: 'Test endpoint failed',
      details: error.message
    }, { status: 500 });
  }
} 
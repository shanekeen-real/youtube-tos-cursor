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

// Try youtube-transcript library first (already installed)
async function getTranscriptViaLibrary(videoId: string): Promise<string | null> {
  try {
    console.log(`Trying youtube-transcript library for video ${videoId}...`);
    
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    
    if (transcriptItems && transcriptItems.length > 0) {
      const transcriptText = transcriptItems
        .map(item => item.text)
        .join(' ');
      
      console.log(`Successfully fetched transcript via library: ${transcriptText.length} characters`);
      return transcriptText;
    }
    
    return null;
  } catch (error: any) {
    console.error(`youtube-transcript library failed:`, error.message);
    return null;
  }
}

// Analyze page structure and extract form information
function analyzePageStructure(html: string, domain: string) {
  const analysis = {
    forms: [] as any[],
    inputs: [] as any[],
    buttons: [] as any[],
    potentialEndpoints: [] as string[],
    hasJavaScript: false,
    hasReact: false,
    hasVue: false
  };

  // Look for forms
  const formMatches = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi);
  if (formMatches) {
    analysis.forms = formMatches.map(form => {
      const actionMatch = form.match(/action="([^"]*)"/i);
      const methodMatch = form.match(/method="([^"]*)"/i);
      return {
        action: actionMatch ? actionMatch[1] : '',
        method: methodMatch ? methodMatch[1] : 'GET',
        html: form
      };
    });
  }

  // Look for input fields
  const inputMatches = html.match(/<input[^>]*>/gi);
  if (inputMatches) {
    analysis.inputs = inputMatches.map(input => {
      const nameMatch = input.match(/name="([^"]*)"/i);
      const typeMatch = input.match(/type="([^"]*)"/i);
      const valueMatch = input.match(/value="([^"]*)"/i);
      return {
        name: nameMatch ? nameMatch[1] : '',
        type: typeMatch ? typeMatch[1] : 'text',
        value: valueMatch ? valueMatch[1] : ''
      };
    });
  }

  // Look for potential API endpoints
  const endpointMatches = html.match(/["'](\/api\/[^"']+)["']/g);
  if (endpointMatches) {
    analysis.potentialEndpoints = endpointMatches.map(match => match.replace(/["']/g, ''));
  }

  return analysis;
}

// Get transcript using the working youtubetotranscript.com service
async function getTranscriptViaWebScraping(videoId: string): Promise<string | null> {
  try {
    console.log(`Getting transcript for video ${videoId} using youtubetotranscript.com...`);
    
    const response = await axios.get(`https://youtubetotranscript.com/transcript?youtube_url=https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://youtubetotranscript.com/'
      },
      timeout: 30000,
      maxRedirects: 5
    });

    if (response.status === 200 && response.data) {
      const html = response.data;
      
      // Check if this is a processed transcript page
      const isProcessedPage = html.includes('data-video_id=') || 
                             html.includes('data-current_language_code=') ||
                             html.includes('data-transcript_categories=');
      
      if (isProcessedPage) {
        // Extract transcript content
        const transcriptMatch = html.match(/<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                               html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/i) ||
                               html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) ||
                               html.match(/<div[^>]*id="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                               html.match(/<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                               html.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                               html.match(/<div[^>]*class="[^"]*output[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
                               html.match(/<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        
        if (transcriptMatch && transcriptMatch[1].trim().length > 100) {
          const transcript = transcriptMatch[1].replace(/<[^>]*>/g, '').trim();
          
          // Validate it's real transcript content
          const hasRealContent = transcript.length > 200 && 
                                !transcript.includes('Bookmark us') &&
                                !transcript.includes('cmd+d') &&
                                !transcript.includes('ctrl+d') &&
                                !transcript.includes('YouTubeToTranscript.com') &&
                                (transcript.includes('.') || transcript.includes('!') || transcript.includes('?') || 
                                 transcript.includes(',') || transcript.includes(':') || transcript.includes(';') ||
                                 transcript.includes('[') || transcript.includes(']') || 
                                 transcript.includes('(') || transcript.includes(')') ||
                                 /\d{1,2}:\d{2}/.test(transcript) ||
                                 /^[A-Z][a-z]+:/.test(transcript) ||
                                 transcript.split('\n').length > 5);
          
          if (hasRealContent) {
            console.log(`Successfully extracted transcript: ${transcript.length} characters`);
            return transcript;
          }
        }
      }
    }
    
    console.log(`Failed to extract transcript from youtubetotranscript.com`);
    return null;
  } catch (error: any) {
    console.error('Transcript extraction error:', error.message);
    return null;
  }
}

// YouTube Data API - Get video metadata as fallback
async function getVideoMetadata(videoId: string): Promise<{ title: string; description: string } | null> {
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
    
    return {
      title: video.snippet.title,
      description: video.snippet.description
    };
  } catch (error: any) {
    console.error('YouTube Data API fetch failed:', error.message);
    return null;
  }
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
    let analysisSource = '';

    // 1. Try youtube-transcript library first (most reliable)
    const libraryTranscript = await getTranscriptViaLibrary(videoId);
    if (libraryTranscript) {
      analyzedContent = libraryTranscript;
      contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
      analysisSource = 'transcript (library)';
    } else {
      // 2. Try advanced web scraping external services
      console.log(`Library failed, trying advanced web scraping for video ${videoId}`);
      const webScrapedTranscript = await getTranscriptViaWebScraping(videoId);
      
      if (webScrapedTranscript) {
        analyzedContent = webScrapedTranscript;
        contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
        analysisSource = 'transcript (web scraping)';
      } else {
        // 3. Fallback to video metadata
        console.log(`Advanced web scraping failed, falling back to video metadata for video ${videoId}`);
        const metadata = await getVideoMetadata(videoId);
        
        if (metadata) {
          analyzedContent = `Title: ${metadata.title}\n\nDescription:\n${metadata.description}`;
          contentToAnalyze = `Analyze the following YouTube video title and description: \n\n---${analyzedContent}---`;
          analysisSource = 'metadata';
        } else {
          return NextResponse.json({ 
            error: "Could not retrieve transcript or video metadata. Please try another video."
          }, { status: 500 });
        }
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
    console.error('URL Analysis API error:', error);
    return NextResponse.json({
      error: 'An unexpected error occurred during analysis.',
      details: error.message
    }, { status: 500 });
  }
} 
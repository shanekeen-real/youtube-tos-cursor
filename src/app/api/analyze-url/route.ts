import { NextRequest, NextResponse } from 'next/server';
import { performAnalysis, performEnhancedAnalysis } from '@/lib/ai-analysis';
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import { adminDb } from '@/lib/firebase-admin'; // Correctly import adminDb
import { createHash } from 'crypto';
import TranscriptClient from "youtube-transcript-api";
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { FieldValue } from 'firebase-admin/firestore';

// Temporary module declaration for missing types
// @ts-ignore
// eslint-disable-next-line
// If you want to add types, create a .d.ts file in your project root
// declare module 'youtube-transcript-api';

// --- Caching Configuration ---
const CACHE_ENABLED = true; // Enable cache for both development and production
const CACHE_DURATION_DAYS = 7;

// Function to create a consistent hash for a URL
function createCacheKey(url: string): string {
    return createHash('sha256').update(url).digest('hex');
}

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

// Replace the old getTranscriptViaLibrary with the new Node.js library implementation
async function getTranscriptViaNodeLibrary(videoId: string): Promise<string | null> {
  try {
    console.log(`Trying youtube-transcript-api Node.js library for video ${videoId}...`);
    const client = new TranscriptClient();
    await client.ready;
    const transcriptObj = await client.getTranscript(videoId);
    if (transcriptObj && transcriptObj.tracks && transcriptObj.tracks.length > 0) {
      // Concatenate all text segments from all tracks
      const transcriptText = transcriptObj.tracks
        .map((track: any) => (track.transcript as Array<{ text: string }> | undefined)?.map((seg: { text: string }) => seg.text).join(' ') || '')
        .join(' ');
      if (transcriptText && transcriptText.length > 0) {
        console.log(`Successfully fetched transcript via Node.js library: ${transcriptText.length} characters`);
        return transcriptText;
      }
    }
    return null;
  } catch (error: any) {
    console.error(`youtube-transcript-api Node.js library failed:`, error.message);
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
    // Get user session for userId
    const session = await auth();
    const userId = session?.user?.id || null;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!url || !isValidYouTubeUrl(url)) {
      return NextResponse.json({ error: 'A valid YouTube URL is required' }, { status: 400 });
    }

    // Check user's scan limit
    let userRef;
    try {
      userRef = adminDb.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData?.scanCount >= userData?.scanLimit) {
          return NextResponse.json({ 
            error: 'You have reached your free scan limit. Please upgrade for unlimited scans.' 
          }, { status: 429 });
        }
      }
    } catch (limitError) {
      console.error('Error checking scan limit:', limitError);
      // Continue with analysis even if limit check fails
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: 'Could not extract video ID from URL' }, { status: 400 });
    }
    const cacheKey = createCacheKey(url);
    // --- Cache Check ---
    // TEMPORARY: Disable cache reads for testing
    // if (CACHE_ENABLED) {
    //     const cacheRef = adminDb.collection('analysis_cache').doc(cacheKey);
    //     const cacheDoc = await cacheRef.get();
    //     if (cacheDoc.exists) {
    //         const cacheData = cacheDoc.data();
    //         if (cacheData && cacheData.timestamp) {
    //             const cacheAgeDays = (Date.now() - cacheData.timestamp.toMillis()) / (1000 * 60 * 60 * 24);
    //             if (cacheAgeDays < CACHE_DURATION_DAYS) {
    //                 console.log(`CACHE HIT: Returning cached analysis for URL: ${url}`);
    //                 return NextResponse.json({
    //                     ...cacheData.analysisResult,
    //                     is_cached: true,
    //                     scanId: cacheKey,
    //                     videoId,
    //                 });
    //             }
    //         }
    //     }
    // }
    console.log(`CACHE MISS: Performing new analysis for URL: ${url}`);
    // --- End Cache Check ---

    let contentToAnalyze = '';
    let analyzedContent = '';
    let analysisSource = '';

    // 1. Try Node.js youtube-transcript-api library first (most reliable)
    const nodeLibraryTranscript = await getTranscriptViaNodeLibrary(videoId);
    if (nodeLibraryTranscript) {
      analyzedContent = nodeLibraryTranscript;
      contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
      analysisSource = 'transcript (nodejs library)';
    } else {
      // 2. Try advanced web scraping external services
      console.log(`Node.js library failed, trying advanced web scraping for video ${videoId}`);
      const webScrapedTranscript = await getTranscriptViaWebScraping(videoId);
      if (webScrapedTranscript) {
        analyzedContent = webScrapedTranscript;
        contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
        analysisSource = 'transcript (web scraping)';
      } else {
        // 3. Fallback to video metadata
        console.log(`All transcript methods failed, falling back to video metadata for video ${videoId}`);
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

    const analysisResult = await performEnhancedAnalysis(contentToAnalyze);
    console.log('AI analysisResult:', analysisResult);

    // Normalize output for frontend compatibility
    const result: any = analysisResult;
    const safeResult = {
      ...result,
      riskLevel: result.riskLevel || result.risk_level || 'Unknown',
      riskScore: result.riskScore || result.risk_score || 0,
      title: result.title || '',
      flaggedSections: result.flaggedSections || result.flagged_section || [],
      suggestions: result.suggestions || [],
    };

    // --- Save to Cache ---
    if (CACHE_ENABLED) {
        const cacheRef = adminDb.collection('analysis_cache').doc(cacheKey);
        await cacheRef.set({
            analysisResult: safeResult,
            timestamp: new Date(),
            original_url: url,
            video_id: videoId,
            userId: userId,
            userEmail: session?.user?.email,
            isCache: true,
        });
        console.log(`CACHE SET: Saved new analysis to cache for URL: ${url}`);
    }
    // --- End Save to Cache ---

    // --- Always save to history using server-side Firebase Admin ---
    try {
      const historyRef = await adminDb.collection('analysis_cache').add({
        analysisResult: safeResult,
        timestamp: new Date(),
        original_url: url,
        video_id: videoId,
        userId: userId,
        userEmail: session?.user?.email,
        isCache: false, // Mark as history scan, not cache
      });

      // Increment user's scan count if userRef exists
      if (userRef) {
        await userRef.update({
          scanCount: FieldValue.increment(1)
        });
      }

      console.log(`HISTORY: Saved new scan to history for video ${videoId}`);
    } catch (historyError) {
      console.error('Failed to save scan to history:', historyError);
      Sentry.captureException(historyError, {
        tags: { component: 'analyze-url', action: 'save-history' },
        extra: { videoId, userId }
      });
    }
    // --- End save to history ---

    return NextResponse.json({
      ...safeResult,
      analyzed_content: analyzedContent,
      analysis_source: analysisSource,
      mode: 'enhanced',
      videoId: videoId,
      scanId: cacheKey,
    });

  } catch (error: any) {
    console.error('Enhanced URL Analysis API error:', error);
    
    // Check if it's a quota error and provide a specific message
    if (error.status === 429 || (error.message && error.message.includes('429'))) {
      return NextResponse.json({
        error: 'AI analysis service is temporarily unavailable due to high usage. Please try again in a few minutes.',
        details: 'Daily quota limit reached. The service will reset at midnight UTC.'
      }, { status: 429 });
    }
    
    return NextResponse.json({
      error: 'An unexpected error occurred during analysis.',
      details: error.message
    }, { status: 500 });
  }
} 
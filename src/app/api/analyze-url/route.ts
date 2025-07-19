import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';
import { performHybridMultiModalVideoAnalysis } from '@/lib/hybrid-multi-modal-analysis';
import { prepareVideoForAnalysis, cleanupVideoFiles } from '@/lib/video-processing';
import { getChannelContext } from '@/lib/channel-context';
import axios from 'axios';
import { adminDb } from '@/lib/firebase-admin'; // Correctly import adminDb
import { createHash } from 'crypto';
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { FieldValue } from 'firebase-admin/firestore';
import { checkUserCanScan } from '@/lib/subscription-utils';
import { 
  YOUTUBE_URL_PATTERNS, 
  ENGLISH_LANGUAGE_VARIANTS, 
  TRANSCRIPT_HTML_PATTERNS,
  FORM_PARSING_PATTERNS,
  extractVideoId, 
  isValidYouTubeUrl, 
  detectLanguage, 
  isNonEnglish 
} from '@/lib/constants/url-patterns';
import { CACHE_CONFIG } from '@/lib/constants/analysis-config';

// Temporary module declaration for missing types
// @ts-ignore
// eslint-disable-next-line
// If you want to add types, create a .d.ts file in your project root
// declare module 'youtube-transcript-api';

// --- Caching Configuration ---
const CACHE_ENABLED = CACHE_CONFIG.ENABLED;
const CACHE_DURATION_DAYS = CACHE_CONFIG.DURATION_DAYS;

// Function to create a consistent hash for a URL
function createCacheKey(url: string): string {
    return createHash('sha256').update(url).digest('hex');
}

// Use imported utility functions from constants

// Get transcript using the working @danielxceron/youtube-transcript library
async function getTranscriptViaNodeLibrary(videoId: string): Promise<string | null> {
  try {
    console.log(`Trying @danielxceron/youtube-transcript library for video ${videoId}...`);
    
    // First try to get English transcript (try multiple English variants)
    for (const langCode of ENGLISH_LANGUAGE_VARIANTS) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang: langCode });
        if (transcript && transcript.length > 0) {
          const transcriptText = transcript
            .map((segment: any) => segment.text)
            .join('\n');
          if (transcriptText && transcriptText.length > 0) {
            console.log(`Successfully fetched ${langCode} transcript via @danielxceron/youtube-transcript: ${transcriptText.length} characters`);
            return transcriptText;
          }
        }
      } catch (englishError: any) {
        console.log(`${langCode} transcript not available: ${englishError.message}`);
      }
    }
    
    console.log(`No English transcript variants available, trying default language`);
    
    // Fallback to default language if English is not available
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcript && transcript.length > 0) {
      const transcriptText = transcript
        .map((segment: any) => segment.text)
        .join('\n');
      if (transcriptText && transcriptText.length > 0) {
        // Check if the transcript appears to be in a non-English language
        const isNonEnglishText = isNonEnglish(transcriptText);
        
        if (isNonEnglishText) {
          const detectedLang = detectLanguage(transcriptText);
          console.log(`Warning: Transcript appears to be in ${detectedLang}. Length: ${transcriptText.length} characters`);
          console.log(`First 200 characters: ${transcriptText.substring(0, 200)}`);
        } else {
          console.log(`Successfully fetched transcript via @danielxceron/youtube-transcript: ${transcriptText.length} characters`);
        }
        return transcriptText;
      }
    }
    return null;
  } catch (error: any) {
    console.error(`@danielxceron/youtube-transcript library failed:`, error.message);
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
  const formMatches = html.match(FORM_PARSING_PATTERNS.FORM_MATCH);
  if (formMatches) {
    analysis.forms = formMatches.map(form => {
      const actionMatch = form.match(FORM_PARSING_PATTERNS.ACTION_MATCH);
      const methodMatch = form.match(FORM_PARSING_PATTERNS.METHOD_MATCH);
      return {
        action: actionMatch ? actionMatch[1] : '',
        method: methodMatch ? methodMatch[1] : 'GET',
        html: form
      };
    });
  }

  // Look for input fields
  const inputMatches = html.match(FORM_PARSING_PATTERNS.INPUT_MATCH);
  if (inputMatches) {
    analysis.inputs = inputMatches.map(input => {
      const nameMatch = input.match(FORM_PARSING_PATTERNS.NAME_MATCH);
      const typeMatch = input.match(FORM_PARSING_PATTERNS.TYPE_MATCH);
      const valueMatch = input.match(FORM_PARSING_PATTERNS.VALUE_MATCH);
      return {
        name: nameMatch ? nameMatch[1] : '',
        type: typeMatch ? typeMatch[1] : 'text',
        value: valueMatch ? valueMatch[1] : ''
      };
    });
  }

  // Look for potential API endpoints
  const endpointMatches = html.match(FORM_PARSING_PATTERNS.ENDPOINT_MATCH);
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
        // Extract transcript content using centralized patterns
        let transcriptMatch = null;
        for (const pattern of TRANSCRIPT_HTML_PATTERNS) {
          transcriptMatch = html.match(pattern);
          if (transcriptMatch) break;
        }
        
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
async function getVideoMetadata(videoId: string): Promise<{ title: string; description: string; channelId?: string } | null> {
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
      description: video.snippet.description,
      channelId: video.snippet.channelId
    };
  } catch (error: any) {
    console.error('YouTube Data API fetch failed:', error.message);
    return null;
  }
}

// Check if video belongs to user's connected YouTube channel
async function isVideoOwnedByUser(videoId: string, userChannelId: string, accessToken: string): Promise<boolean> {
  try {
    // Use the existing getVideoMetadata function to get the video's channel ID
    const metadata = await getVideoMetadata(videoId);
    
    if (!metadata?.channelId) {
      console.log(`Could not determine channel ID for video ${videoId}`);
      return false;
    }
    
    const isOwned = metadata.channelId === userChannelId;
    console.log(`Video ownership check: ${videoId} belongs to ${metadata.channelId}, user channel: ${userChannelId}, owned: ${isOwned}`);
    
    return isOwned;
  } catch (error: any) {
    console.warn('Failed to check video ownership:', error.message);
    return false; // Default to false on error to avoid applying context incorrectly
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
        if (userData) {
          const canScan = checkUserCanScan(userData);
          
          if (!canScan.canScan) {
            return NextResponse.json({ 
              error: canScan.reason || 'You have reached your scan limit. Please upgrade for unlimited scans.' 
            }, { status: 429 });
          }
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
    let metadata: { title: string; description: string } | null = null;
    let videoAnalysisData: any = null;
    metadata = await getVideoMetadata(videoId); // Always fetch metadata first

    // 1. Try multi-modal video analysis first (primary method)
    console.log(`Attempting multi-modal video analysis for: ${videoId}`);
    try {
      videoAnalysisData = await prepareVideoForAnalysis(videoId);
      if (videoAnalysisData && videoAnalysisData.videoInfo?.success) {
        console.log('Multi-modal video analysis prepared successfully');
        analysisSource = 'multi-modal video analysis';
      } else {
        console.log('Multi-modal video analysis not available, falling back to transcript analysis');
        videoAnalysisData = null;
      }
    } catch (videoError) {
      console.warn('Multi-modal video analysis failed:', videoError);
      videoAnalysisData = null;
    }

    // 2. Try Node.js youtube-transcript-api library for transcript
    const nodeLibraryTranscript = await getTranscriptViaNodeLibrary(videoId);
    if (nodeLibraryTranscript) {
      analyzedContent = nodeLibraryTranscript;
      if (videoAnalysisData) {
        videoAnalysisData.transcript = nodeLibraryTranscript;
      } else {
      contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
      analysisSource = 'transcript (nodejs library)';
      }
    } else {
      // 3. Try advanced web scraping external services
      console.log(`Node.js library failed, trying advanced web scraping for video ${videoId}`);
      const webScrapedTranscript = await getTranscriptViaWebScraping(videoId);
      if (webScrapedTranscript) {
        analyzedContent = webScrapedTranscript;
        if (videoAnalysisData) {
          videoAnalysisData.transcript = webScrapedTranscript;
        } else {
        contentToAnalyze = `Analyze the following YouTube video transcript: \n\n---${analyzedContent}---`;
        analysisSource = 'transcript (web scraping)';
        }
      } else {
        // 4. Fallback to video metadata
        if (metadata) {
          analyzedContent = `Title: ${metadata.title}\n\nDescription:\n${metadata.description}`;
          if (videoAnalysisData) {
            videoAnalysisData.metadata = metadata;
          } else {
          contentToAnalyze = `Analyze the following YouTube video title and description: \n\n---${analyzedContent}---`;
          analysisSource = 'metadata';
          }
        } else {
          return NextResponse.json({ 
            error: "Could not retrieve transcript or video metadata. Please try another video."
          }, { status: 500 });
        }
      }
    }

    // Get channel context for AI detection ONLY if video belongs to user's connected YouTube channel
    let channelContext = null;
    try {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
                  if (userData?.youtube?.channel?.id && (session as any).accessToken) {
            // Handle token refresh if needed for video ownership check
            let accessToken = (session as any).accessToken;
            let refreshToken = (session as any).refreshToken;
            let expiresAt = (session as any).expiresAt;
            
            // Check if token is expired or about to expire (within 60 seconds)
            if (expiresAt && Date.now() / 1000 > expiresAt - 60 && refreshToken) {
              console.log('Token expired, attempting refresh for video ownership check...');
              try {
                const { refreshGoogleAccessToken } = await import('@/lib/auth');
                const refreshed = await refreshGoogleAccessToken(refreshToken);
                accessToken = refreshed.access_token;
                console.log('Token refreshed successfully for video ownership check');
              } catch (err) {
                console.error('Failed to refresh token for video ownership check:', err);
                // Continue without channel context - this is not critical
              }
            }
            
            // Check if this video belongs to the user's channel before applying context
            const isOwned = await isVideoOwnedByUser(videoId, userData.youtube.channel.id, accessToken);
          
          if (isOwned) {
            console.log(`Applying channel context for user's own video: ${videoId}`);
            channelContext = await getChannelContext(userData.youtube.channel.id, accessToken);
          } else {
            console.log(`Skipping channel context for external video: ${videoId}`);
          }
        }
      }
    } catch (contextError) {
      console.warn('Failed to get channel context for AI detection:', contextError);
      // Continue without context - this is not critical
    }

    // Perform analysis based on available data
    let analysisResult;
    if (videoAnalysisData && videoAnalysisData.videoInfo?.success) {
      console.log('Performing hybrid multi-modal video analysis');
      analysisResult = await performHybridMultiModalVideoAnalysis(videoAnalysisData, channelContext);
    } else {
      console.log('Performing text-only analysis');
      analysisResult = await performEnhancedAnalysis(contentToAnalyze, channelContext);
    }
    console.log('AI analysisResult:', analysisResult);

    // Normalize output for frontend compatibility
    const result: any = analysisResult;
    // Always set the title from metadata if AI did not provide it
    if (!result.title && metadata?.title) {
      result.title = metadata.title;
    }
    const safeResult = {
      ...result,
      riskLevel: result.riskLevel || result.risk_level || 'Unknown',
      riskScore: result.riskScore || result.risk_score || 0,
      title: result.title || metadata?.title || '',
      flaggedSections: result.flaggedSections || result.flagged_section || [],
      suggestions: result.suggestions || [],
    };

    // --- Save to Cache ---
    if (CACHE_ENABLED) {
        const cacheRef = adminDb.collection('analysis_cache').doc(cacheKey);
        await cacheRef.set({
            analysisResult: safeResult,
            analyzed_content: analyzedContent,
            analysis_source: analysisSource,
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

    // Clean up video files if multi-modal analysis was used
    if (videoAnalysisData && videoAnalysisData.videoInfo?.videoPath) {
      try {
        await cleanupVideoFiles(videoAnalysisData.videoInfo.videoPath);
        console.log('Cleaned up video files after analysis');
      } catch (cleanupError) {
        console.warn('Failed to clean up video files:', cleanupError);
      }
    }

    // --- Always save to history using server-side Firebase Admin ---
    try {
      const historyRef = await adminDb.collection('analysis_cache').add({
        analysisResult: safeResult,
        analyzed_content: analyzedContent,
        analysis_source: analysisSource,
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
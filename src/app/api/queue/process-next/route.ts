import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { ScanQueueItem } from '@/types/queue';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';
import { performHybridMultiModalVideoAnalysis } from '@/lib/hybrid-multi-modal-analysis';
import { prepareVideoForAnalysis, cleanupVideoFiles } from '@/lib/video-processing';
import { getChannelContext, ChannelContext as ChannelContextFromLib } from '@/lib/channel-context';
import { ChannelContext } from '@/types/user';
import { extractVideoId, ENGLISH_LANGUAGE_VARIANTS, TRANSCRIPT_HTML_PATTERNS, detectLanguage, isNonEnglish } from '@/lib/constants/url-patterns';
import { QueryDocumentSnapshot, DocumentData, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { YoutubeTranscript } from '@danielxceron/youtube-transcript';
import { YouTubeTranscriptSegment, NormalizedAnalysisResult } from '@/types/analysis';
import { EnhancedAnalysisResult } from '@/types/ai-analysis';
import { createHash } from 'crypto';
import axios from 'axios';
import * as Sentry from "@sentry/nextjs";

// Get video metadata from YouTube
async function getVideoMetadata(videoId: string): Promise<{ title: string; description: string; channelId?: string } | null> {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      // Try YouTube Data API first for better metadata
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;
      const response = await axios.get(apiUrl);
      
      const video = response.data.items[0];
      if (video) {
        return {
          title: video.snippet.title,
          description: video.snippet.description,
          channelId: video.snippet.channelId
        };
      }
    }
    
    // Fallback to oembed
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'Untitled Video',
        description: data.author_name || ''
      };
    }
  } catch (error) {
    console.error('Failed to fetch video metadata:', error);
  }
  return null;
}

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
            .map((segment: YouTubeTranscriptSegment) => segment.text)
            .join('\n');
          if (transcriptText && transcriptText.length > 0) {
            console.log(`Successfully fetched ${langCode} transcript via @danielxceron/youtube-transcript: ${transcriptText.length} characters`);
            return transcriptText;
          }
        }
      } catch (englishError: unknown) {
        const error = englishError as Error;
        console.log(`${langCode} transcript not available: ${error.message}`);
      }
    }
    
    console.log(`No English transcript variants available, trying default language`);
    
    // Fallback to default language if English is not available
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (transcript && transcript.length > 0) {
      const transcriptText = transcript
        .map((segment: YouTubeTranscriptSegment) => segment.text)
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
  } catch (error: unknown) {
    const transcriptError = error as Error;
    console.error(`@danielxceron/youtube-transcript library failed:`, transcriptError.message);
    return null;
  }
}

// Get transcript via web scraping
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
  } catch (error: unknown) {
    const scrapingError = error as Error;
    console.error('Transcript extraction error:', scrapingError.message);
    return null;
  }
}

// Function to create a consistent hash for a URL
function createCacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

// Convert channel context from lib format to user types format
function convertChannelContext(context: ChannelContextFromLib | null): ChannelContext | undefined {
  if (!context) return undefined;
  
  return {
    channelId: context.channelData.channelId,
    channelTitle: context.channelData.title,
    subscriberCount: context.channelData.subscriberCount,
    totalViews: context.channelData.viewCount,
    videoCount: context.channelData.videoCount,
    uploadFrequency: context.channelData.uploadFrequency?.toString(),
    contentCategories: [context.channelData.category],
    monetizationStatus: 'enabled', // Default assumption
    channelData: {
      accountDate: context.channelData.accountDate,
      subscriberCount: context.channelData.subscriberCount,
      videoCount: context.channelData.videoCount,
    },
    aiIndicators: {
      aiProbability: context.aiIndicators.aiProbability,
    },
  };
}

// Check if video belongs to user's connected YouTube channel
async function isVideoOwnedByUser(videoId: string, userChannelId: string): Promise<boolean> {
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
  } catch (error: unknown) {
    const ownershipError = error as Error;
    console.warn('Failed to check video ownership:', ownershipError.message);
    return false; // Default to false on error to avoid applying context incorrectly
  }
}

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/queue/process-next",
    },
    async () => {
      return await processNextQueueItem();
    }
  );
}

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/queue/process-next",
    },
    async () => {
      return await processNextQueueItem();
    }
  );
}

async function processNextQueueItem() {
  try {
    // Get the next pending scan from the queue using server-side sorting
    const queueSnapshot = await adminDb.collection('scan_queue')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc') // Server-side sorting
      .limit(1) // Only get the oldest pending item
      .get();
    
    if (queueSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No pending scans in queue'
      });
    }
    
    const queueDoc = queueSnapshot.docs[0];
    const queueItem = { id: queueDoc.id, ...queueDoc.data() } as ScanQueueItem;

    console.log(`Processing queue item: ${queueItem.id} for video: ${queueItem.videoId}`);

    // Double-check that the item is still pending before processing
    const currentDoc = await queueDoc.ref.get();
    const currentData = currentDoc.data();
    
    if (!currentData || currentData.status !== 'pending') {
      console.log(`Queue item ${queueItem.id} is no longer pending (status: ${currentData?.status}), skipping`);
      return NextResponse.json({
        success: true,
        message: 'Queue item already being processed or completed'
      });
    }

    // Update status to processing
    await queueDoc.ref.update({
      status: 'processing',
      startedAt: new Date(),
      currentStep: 'Starting analysis...',
      progress: 10
    });

    // Set up a timeout to prevent scans from getting stuck
    const timeoutId = setTimeout(async () => {
      try {
        const currentDoc = await queueDoc.ref.get();
        const currentData = currentDoc.data();
        if (currentData && currentData.status === 'processing') {
          console.warn(`Scan ${queueItem.id} timed out, marking as failed`);
          await queueDoc.ref.update({
            status: 'failed',
            error: 'Scan timed out after 5 minutes',
            completedAt: new Date()
          });
        }
      } catch (timeoutError) {
        console.error('Error in timeout handler:', timeoutError);
      }
    }, 5 * 60 * 1000); // 5 minutes timeout

    try {
      const videoId = extractVideoId(queueItem.originalUrl);
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }

      // Step 1: Video Preparation (20%)
      await queueDoc.ref.update({
        currentStep: 'Preparing video for analysis...',
        progress: 20,
        currentStepIndex: 1
      });

      let contentToAnalyze = '';
      let analyzedContent = '';
      let analysisSource = '';
      let metadata: { title: string; description: string; channelId?: string } | null = null;
      let videoAnalysisData = null;

      // Get video metadata
      metadata = await getVideoMetadata(videoId);

      // Step 2: Content Extraction (40%)
      await queueDoc.ref.update({
        currentStep: 'Extracting video content...',
        progress: 40,
        currentStepIndex: 2
      });

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
            if (videoAnalysisData && metadata) {
              videoAnalysisData.metadata = {
                id: videoId,
                title: metadata.title,
                description: metadata.description
              };
            } else {
              contentToAnalyze = `Analyze the following YouTube video title and description: \n\n---${analyzedContent}---`;
              analysisSource = 'metadata';
            }
          } else {
            // Final fallback
            contentToAnalyze = `Video Title: ${queueItem.videoTitle}\nVideo ID: ${videoId}\nURL: ${queueItem.originalUrl}`;
            analysisSource = 'fallback';
          }
        }
      }

      // Step 3: AI Analysis (60%)
      await queueDoc.ref.update({
        currentStep: 'Performing AI analysis...',
        progress: 60,
        currentStepIndex: 3
      });

      // Get channel context for AI detection ONLY if video belongs to user's connected YouTube channel
      let channelContext = null;
      if (queueItem.isOwnVideo && metadata?.channelId) {
        try {
          const userDoc = await adminDb.collection('users').doc(queueItem.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.youtube?.channel?.id) {
              // Check if this video belongs to the user's channel before applying context
              const isOwned = await isVideoOwnedByUser(videoId, userData.youtube.channel.id);
            
              if (isOwned) {
                console.log(`Applying channel context for user's own video: ${videoId}`);
                channelContext = await getChannelContext(userData.youtube.channel.id, '');
              } else {
                console.log(`Skipping channel context for external video: ${videoId}`);
              }
            }
          }
        } catch (contextError) {
          console.warn('Failed to get channel context for AI detection:', contextError);
          // Continue without context - this is not critical
        }
      }

      // Perform analysis based on available data
      let analysisResult;
      if (videoAnalysisData && videoAnalysisData.videoInfo?.success) {
        console.log('Performing hybrid multi-modal video analysis');
        analysisResult = await performHybridMultiModalVideoAnalysis(videoAnalysisData, convertChannelContext(channelContext));
      } else {
        console.log('Performing text-only analysis');
        analysisResult = await performEnhancedAnalysis(contentToAnalyze, convertChannelContext(channelContext));
      }
      console.log('AI analysisResult:', analysisResult);

      // Step 4: Risk & Policy Analysis (80%)
      await queueDoc.ref.update({
        currentStep: 'Analyzing risks and policies...',
        progress: 80,
        currentStepIndex: 4
      });

      // Normalize output for frontend compatibility
      const result = analysisResult as EnhancedAnalysisResult;
      const safeResult: NormalizedAnalysisResult = {
        ...result,
        riskLevel: result.risk_level || 'Unknown',
        riskScore: result.risk_score || 0,
        title: metadata?.title || queueItem.videoTitle,
        flaggedSections: result.flagged_section ? [result.flagged_section] : [],
        suggestions: result.suggestions || [],
      };

      // Step 5: Save Results (90%)
      await queueDoc.ref.update({
        currentStep: 'Saving results...',
        progress: 90,
        currentStepIndex: 5
      });

      // Clean up video files if multi-modal analysis was used
      if (videoAnalysisData && videoAnalysisData.videoInfo?.videoPath) {
        try {
          await cleanupVideoFiles(videoAnalysisData.videoInfo.videoPath);
          console.log('Cleaned up video files after analysis');
        } catch (cleanupError) {
          console.warn('Failed to clean up video files:', cleanupError);
        }
      }

      // Save to analysis_cache
      const cacheRef = await adminDb.collection('analysis_cache').add({
        analysisResult: safeResult,
        analyzed_content: analyzedContent,
        analysis_source: analysisSource,
        timestamp: Timestamp.now(),
        original_url: queueItem.originalUrl,
        video_id: videoId,
        userId: queueItem.userId,
        isCache: false,
      });

      // Increment user's scan count
      try {
        const userRef = adminDb.collection('users').doc(queueItem.userId);
        await userRef.update({
          scanCount: FieldValue.increment(1)
        });
        console.log(`Incremented scan count for user ${queueItem.userId}`);
      } catch (scanCountError) {
        console.warn('Failed to increment scan count:', scanCountError);
        // Continue - this is not critical
      }

      // Clear the timeout since scan completed successfully
      clearTimeout(timeoutId);

      // Update queue item as completed and auto-archive from "In Queue" tab
      await queueDoc.ref.update({
        status: 'completed',
        progress: 100,
        currentStep: 'Analysis completed',
        completedAt: Timestamp.now(),
        scanId: cacheRef.id,
        archivedFromQueue: true  // Auto-archive completed scans from "In Queue" tab
      });

      console.log(`Successfully completed analysis for queue item: ${queueItem.id}`);

      // Send completion notification
      try {
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/queue/notify-completion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: queueItem.userId,
            queueId: queueItem.id,
            scanId: cacheRef.id,
            videoTitle: queueItem.videoTitle,
            videoId: queueItem.videoId
          })
        }).catch(error => {
          console.warn('Failed to send completion notification:', error);
          // This is not critical - the scan is still completed successfully
        });
      } catch (notificationError) {
        console.warn('Failed to send completion notification:', notificationError);
        // This is not critical - the scan is still completed successfully
      }

      // Check if there are more pending scans and trigger processing of the next one
      const remainingPending = await adminDb.collection('scan_queue')
        .where('status', '==', 'pending')
        .limit(1)
        .get();
      
      if (!remainingPending.empty) {
        console.log('More pending scans found, triggering next processing...');
        // Trigger processing of the next scan after a short delay
        setTimeout(() => {
          fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/queue/process-next`, {
            method: 'GET'
          }).catch(error => {
            console.warn('Failed to trigger next scan processing:', error);
          });
        }, 2000); // 2 second delay between scans
      }

      return NextResponse.json({
        success: true,
        queueId: queueItem.id,
        scanId: cacheRef.id,
        message: 'Scan completed successfully'
      });

    } catch (analysisError: unknown) {
      console.error('Analysis failed for queue item:', queueItem.id, analysisError);
      
      // Clear the timeout since scan failed
      clearTimeout(timeoutId);
      
      // Update queue item as failed
      await queueDoc.ref.update({
        status: 'failed',
        error: analysisError instanceof Error ? analysisError.message : 'Analysis failed',
        completedAt: Timestamp.now()
      });

      // Don't throw the error, just return it as a response
      return NextResponse.json({ 
        error: 'Analysis failed', 
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        queueId: queueItem.id
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error processing queue:', error);
    Sentry.captureException(error, {
      tags: { component: 'queue', action: 'process-next' }
    });

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to process queue', 
      details: errorMessage 
    }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { z } from 'zod';

// Branded types for better type safety
type VideoId = string & { readonly brand: unique symbol };
type ChannelId = string & { readonly brand: unique symbol };
type AccessToken = string & { readonly brand: unique symbol };

// Zod schemas for YouTube API responses
const YouTubeVideoSnippetSchema = z.object({
  title: z.string().optional(),
  channelId: z.string().optional(),
  channelTitle: z.string().optional(),
  description: z.string().optional(),
  publishedAt: z.string().optional(),
  thumbnails: z.record(z.object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
});

const YouTubeVideoStatusSchema = z.object({
  privacyStatus: z.string().optional(),
  uploadStatus: z.string().optional(),
  embeddable: z.boolean().optional(),
  publicStatsViewable: z.boolean().optional(),
  madeForKids: z.boolean().optional(),
});

const YouTubeVideoStatisticsSchema = z.object({
  viewCount: z.string().optional(),
  likeCount: z.string().optional(),
  commentCount: z.string().optional(),
});

const YouTubeVideoItemSchema = z.object({
  id: z.string().optional(),
  snippet: YouTubeVideoSnippetSchema.optional(),
  statistics: YouTubeVideoStatisticsSchema.optional(),
  status: YouTubeVideoStatusSchema.optional(),
});

const YouTubeVideoResponseSchema = z.object({
  items: z.array(YouTubeVideoItemSchema).optional(),
  pageInfo: z.object({
    totalResults: z.number().optional(),
    resultsPerPage: z.number().optional(),
  }).optional(),
});

const YouTubeChannelSnippetSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  customUrl: z.string().optional(),
  publishedAt: z.string().optional(),
  thumbnails: z.record(z.object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
});

const YouTubeChannelItemSchema = z.object({
  id: z.string().optional(),
  snippet: YouTubeChannelSnippetSchema.optional(),
});

const YouTubeChannelResponseSchema = z.object({
  items: z.array(YouTubeChannelItemSchema).optional(),
  pageInfo: z.object({
    totalResults: z.number().optional(),
    resultsPerPage: z.number().optional(),
  }).optional(),
});

const YouTubeErrorResponseSchema = z.object({
  error: z.object({
    code: z.number().optional(),
    message: z.string().optional(),
    errors: z.array(z.object({
      domain: z.string().optional(),
      reason: z.string().optional(),
      message: z.string().optional(),
    })).optional(),
  }).optional(),
});

// Type definitions using Zod inferred types
type YouTubeVideoResponse = z.infer<typeof YouTubeVideoResponseSchema>;
type YouTubeChannelResponse = z.infer<typeof YouTubeChannelResponseSchema>;
type YouTubeErrorResponse = z.infer<typeof YouTubeErrorResponseSchema>;
type YouTubeVideoItem = z.infer<typeof YouTubeVideoItemSchema>;
type YouTubeChannelItem = z.infer<typeof YouTubeChannelItemSchema>;

// Type guards for runtime validation
function isValidYouTubeVideoResponse(data: unknown): data is YouTubeVideoResponse {
  return YouTubeVideoResponseSchema.safeParse(data).success;
}

function isValidYouTubeChannelResponse(data: unknown): data is YouTubeChannelResponse {
  return YouTubeChannelResponseSchema.safeParse(data).success;
}

function isValidYouTubeErrorResponse(data: unknown): data is YouTubeErrorResponse {
  return YouTubeErrorResponseSchema.safeParse(data).success;
}

// Request body schema
const TestVideoRequestSchema = z.object({
  videoUrl: z.string().url(),
});

type TestVideoRequest = z.infer<typeof TestVideoRequestSchema>;

// Results interface
interface TestVideoResults {
  videoId: string;
  videoDetails?: YouTubeVideoResponse;
  videoError?: YouTubeErrorResponse;
  videoInfo?: {
    title?: string;
    channelId?: string;
    channelTitle?: string;
    privacyStatus?: string;
    uploadStatus?: string;
    embeddable?: boolean;
    publicStatsViewable?: boolean;
    madeForKids?: boolean;
  };
  channelInfo?: YouTubeChannelResponse;
  channelError?: YouTubeErrorResponse;
}

interface TestVideoSummary {
  videoId: string;
  videoFound: boolean;
  channelFound: boolean;
  privacyStatus?: string;
  channelTitle?: string;
}

interface TestVideoResponse {
  success: boolean;
  results: TestVideoResults;
  summary: TestVideoSummary;
}

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/test-video-by-url",
    },
    async () => {
      try {
        const session = await auth();
        
        if (!session?.user?.id || !session?.accessToken) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate request body
        const body = await req.json();
        const validationResult = TestVideoRequestSchema.safeParse(body);
        
        if (!validationResult.success) {
          return NextResponse.json({ 
            error: 'Invalid request body', 
            details: validationResult.error.errors 
          }, { status: 400 });
        }

        const { videoUrl } = validationResult.data;
        
        // Extract video ID from URL
        let videoId = '';
        const urlPatterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
          /youtube\.com\/v\/([^&\n?#]+)/,
        ];

        for (const pattern of urlPatterns) {
          const match = videoUrl.match(pattern);
          if (match) {
            videoId = match[1];
            break;
          }
        }

        if (!videoId) {
          return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
        }

        const accessToken = session.accessToken;
        const results: TestVideoResults = { videoId };

        // Test 1: Get video details
        console.log('Testing: Get video details for ID:', videoId);
        const videoResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,status&id=${videoId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          
          // Validate and sanitize video data
          if (isValidYouTubeVideoResponse(videoData)) {
            results.videoDetails = videoData;
            console.log('Video details found:', videoData.items?.length || 0);
            
            if (videoData.items && videoData.items.length > 0) {
              const video = videoData.items[0];
              results.videoInfo = {
                title: video.snippet?.title,
                channelId: video.snippet?.channelId,
                channelTitle: video.snippet?.channelTitle,
                privacyStatus: video.status?.privacyStatus,
                uploadStatus: video.status?.uploadStatus,
                embeddable: video.status?.embeddable,
                publicStatsViewable: video.status?.publicStatsViewable,
                madeForKids: video.status?.madeForKids,
              };
            }
          } else {
            console.warn('Invalid video response structure:', videoData);
            results.videoError = { error: { message: 'Invalid video response structure' } };
          }
        } else {
          const errorData = await videoResponse.json();
          if (isValidYouTubeErrorResponse(errorData)) {
            results.videoError = errorData;
          } else {
            results.videoError = { error: { message: 'Unknown video API error' } };
          }
        }

        // Test 2: Check if user owns this video
        if (results.videoInfo?.channelId) {
          console.log('Testing: Check channel ownership for:', results.videoInfo.channelId);
          const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${results.videoInfo.channelId}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            }
          );
          
          if (channelResponse.ok) {
            const channelData = await channelResponse.json();
            
            // Validate and sanitize channel data
            if (isValidYouTubeChannelResponse(channelData)) {
              results.channelInfo = channelData;
              console.log('Channel info found:', channelData.items?.length || 0);
            } else {
              console.warn('Invalid channel response structure:', channelData);
              results.channelError = { error: { message: 'Invalid channel response structure' } };
            }
          } else {
            const errorData = await channelResponse.json();
            if (isValidYouTubeErrorResponse(errorData)) {
              results.channelError = errorData;
            } else {
              results.channelError = { error: { message: 'Unknown channel API error' } };
            }
          }
        }

        const summary: TestVideoSummary = {
          videoId,
          videoFound: (results.videoDetails?.items?.length || 0) > 0,
          channelFound: (results.channelInfo?.items?.length || 0) > 0,
          privacyStatus: results.videoInfo?.privacyStatus,
          channelTitle: results.videoInfo?.channelTitle,
        };

        const response: TestVideoResponse = {
          success: true,
          results,
          summary,
        };

        return NextResponse.json(response);
      } catch (error: unknown) {
        console.error('Error testing video by URL:', error);
        Sentry.captureException(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ 
          error: 'Internal server error', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
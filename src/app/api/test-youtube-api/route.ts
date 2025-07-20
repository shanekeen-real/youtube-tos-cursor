import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { z } from 'zod';

// Branded types for better type safety
type ChannelId = string & { readonly brand: unique symbol };
type AccessToken = string & { readonly brand: unique symbol };

// Zod schemas for YouTube API responses
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

const YouTubeChannelStatisticsSchema = z.object({
  viewCount: z.string().optional(),
  subscriberCount: z.string().optional(),
  hiddenSubscriberCount: z.boolean().optional(),
  videoCount: z.string().optional(),
});

const YouTubeChannelItemSchema = z.object({
  id: z.string().optional(),
  snippet: YouTubeChannelSnippetSchema.optional(),
  statistics: YouTubeChannelStatisticsSchema.optional(),
});

const YouTubeChannelResponseSchema = z.object({
  items: z.array(YouTubeChannelItemSchema).optional(),
  pageInfo: z.object({
    totalResults: z.number().optional(),
    resultsPerPage: z.number().optional(),
  }).optional(),
});

const YouTubeVideoSnippetSchema = z.object({
  publishedAt: z.string().optional(),
  channelId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  thumbnails: z.record(z.object({
    url: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).optional(),
  channelTitle: z.string().optional(),
  videoId: z.string().optional(),
});

const YouTubeVideoItemSchema = z.object({
  id: z.object({
    videoId: z.string().optional(),
  }).optional(),
  snippet: YouTubeVideoSnippetSchema.optional(),
});

const YouTubeVideoResponseSchema = z.object({
  items: z.array(YouTubeVideoItemSchema).optional(),
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
type YouTubeChannelResponse = z.infer<typeof YouTubeChannelResponseSchema>;
type YouTubeVideoResponse = z.infer<typeof YouTubeVideoResponseSchema>;
type YouTubeErrorResponse = z.infer<typeof YouTubeErrorResponseSchema>;
type YouTubeChannelItem = z.infer<typeof YouTubeChannelItemSchema>;
type YouTubeVideoItem = z.infer<typeof YouTubeVideoItemSchema>;

// Type guards for runtime validation
function isValidYouTubeChannelResponse(data: unknown): data is YouTubeChannelResponse {
  return YouTubeChannelResponseSchema.safeParse(data).success;
}

function isValidYouTubeVideoResponse(data: unknown): data is YouTubeVideoResponse {
  return YouTubeVideoResponseSchema.safeParse(data).success;
}

function isValidYouTubeErrorResponse(data: unknown): data is YouTubeErrorResponse {
  return YouTubeErrorResponseSchema.safeParse(data).success;
}

// Results interface
interface YouTubeApiTestResults {
  channels?: YouTubeChannelResponse;
  channelsError?: YouTubeErrorResponse;
  mineVideos?: YouTubeVideoResponse;
  mineError?: YouTubeErrorResponse;
  forMineVideos?: YouTubeVideoResponse;
  forMineError?: YouTubeErrorResponse;
  channelVideos?: YouTubeVideoResponse;
  channelError?: YouTubeErrorResponse;
}

interface YouTubeApiTestSummary {
  channelsFound: number;
  mineVideosFound: number;
  forMineVideosFound: number;
  channelVideosFound: number;
}

interface YouTubeApiTestResponse {
  success: boolean;
  results: YouTubeApiTestResults;
  summary: YouTubeApiTestSummary;
}

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/test-youtube-api",
    },
    async () => {
      try {
        const session = await auth();
        
        if (!session?.user?.id || !session?.accessToken) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const accessToken = session.accessToken;
        const results: YouTubeApiTestResults = {};

        // Test 1: Get user's channels
        console.log('Testing: Get user channels...');
        const channelsResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json();
          
          // Validate and sanitize channels data
          if (isValidYouTubeChannelResponse(channelsData)) {
            results.channels = channelsData;
            console.log('Channels found:', channelsData.items?.length || 0);
          } else {
            console.warn('Invalid channels response structure:', channelsData);
            results.channelsError = { error: { message: 'Invalid channels response structure' } };
          }
        } else {
          const errorData = await channelsResponse.json();
          if (isValidYouTubeErrorResponse(errorData)) {
            results.channelsError = errorData;
          } else {
            results.channelsError = { error: { message: 'Unknown channels API error' } };
          }
        }

        // Test 2: Get videos with mine=true
        console.log('Testing: Get videos with mine=true...');
        const mineResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/search?part=snippet&mine=true&type=video&maxResults=10&order=date',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (mineResponse.ok) {
          const mineData = await mineResponse.json();
          
          // Validate and sanitize mine videos data
          if (isValidYouTubeVideoResponse(mineData)) {
            results.mineVideos = mineData;
            console.log('Mine videos found:', mineData.items?.length || 0);
          } else {
            console.warn('Invalid mine videos response structure:', mineData);
            results.mineError = { error: { message: 'Invalid mine videos response structure' } };
          }
        } else {
          const errorData = await mineResponse.json();
          if (isValidYouTubeErrorResponse(errorData)) {
            results.mineError = errorData;
          } else {
            results.mineError = { error: { message: 'Unknown mine videos API error' } };
          }
        }

        // Test 3: Get videos with forMine=true (alternative)
        console.log('Testing: Get videos with forMine=true...');
        const forMineResponse = await fetch(
          'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=10&order=date',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );
        
        if (forMineResponse.ok) {
          const forMineData = await forMineResponse.json();
          
          // Validate and sanitize forMine videos data
          if (isValidYouTubeVideoResponse(forMineData)) {
            results.forMineVideos = forMineData;
            console.log('ForMine videos found:', forMineData.items?.length || 0);
          } else {
            console.warn('Invalid forMine videos response structure:', forMineData);
            results.forMineError = { error: { message: 'Invalid forMine videos response structure' } };
          }
        } else {
          const errorData = await forMineResponse.json();
          if (isValidYouTubeErrorResponse(errorData)) {
            results.forMineError = errorData;
          } else {
            results.forMineError = { error: { message: 'Unknown forMine videos API error' } };
          }
        }

        // Test 4: Get videos with channelId if we have a channel
        if (results.channels?.items && results.channels.items.length > 0) {
          const channelId = results.channels.items[0].id;
          if (channelId) {
            console.log('Testing: Get videos for channel ID:', channelId);
            
            const channelResponse = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=10&order=date`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Accept': 'application/json',
                },
              }
            );
            
            if (channelResponse.ok) {
              const channelData = await channelResponse.json();
              
              // Validate and sanitize channel videos data
              if (isValidYouTubeVideoResponse(channelData)) {
                results.channelVideos = channelData;
                console.log('Channel videos found:', channelData.items?.length || 0);
              } else {
                console.warn('Invalid channel videos response structure:', channelData);
                results.channelError = { error: { message: 'Invalid channel videos response structure' } };
              }
            } else {
              const errorData = await channelResponse.json();
              if (isValidYouTubeErrorResponse(errorData)) {
                results.channelError = errorData;
              } else {
                results.channelError = { error: { message: 'Unknown channel videos API error' } };
              }
            }
          }
        }

        const summary: YouTubeApiTestSummary = {
          channelsFound: results.channels?.items?.length || 0,
          mineVideosFound: results.mineVideos?.items?.length || 0,
          forMineVideosFound: results.forMineVideos?.items?.length || 0,
          channelVideosFound: results.channelVideos?.items?.length || 0,
        };

        const response: YouTubeApiTestResponse = {
          success: true,
          results,
          summary,
        };

        return NextResponse.json(response);
      } catch (error: unknown) {
        console.error('Error testing YouTube API:', error);
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
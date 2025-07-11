import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getChannelContext } from '@/lib/channel-context';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/test-channel-context",
    },
    async () => {
      try {
        const session = await auth();
        
        if (!session?.user?.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!(session as any).accessToken) {
          return NextResponse.json({ error: 'No access token available' }, { status: 400 });
        }

        // Test with a known channel ID (YouTube's official channel)
        const testChannelId = 'UCBR8-60-B28hp2BmDPdntcQ'; // YouTube's official channel
        
        const channelContext = await getChannelContext(testChannelId, (session as any).accessToken);
        
        if (!channelContext) {
          return NextResponse.json({ 
            error: 'Failed to get channel context',
            message: 'This could be due to API quota limits or invalid channel ID'
          }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true,
          channelContext: {
            channelData: {
              channelId: channelContext.channelData.channelId,
              title: channelContext.channelData.title,
              verified: channelContext.channelData.verified,
              subscriberCount: channelContext.channelData.subscriberCount,
              videoCount: channelContext.channelData.videoCount,
            },
            aiIndicators: {
              aiProbability: channelContext.aiIndicators.aiProbability,
              confidence: channelContext.aiIndicators.confidence,
              uploadConsistency: channelContext.aiIndicators.uploadConsistency,
              titleVariation: channelContext.aiIndicators.titleVariation,
            },
            lastUpdated: channelContext.lastUpdated,
          }
        });

      } catch (error: any) {
        Sentry.captureException(error);
        console.error('Error testing channel context:', error);
        return NextResponse.json({ 
          error: 'Internal server error',
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
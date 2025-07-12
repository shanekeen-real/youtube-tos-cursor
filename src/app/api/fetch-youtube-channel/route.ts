import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { getChannelContext } from '@/lib/channel-context';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/fetch-youtube-channel",
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

        // Fetch YouTube channel data
        const response = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: {
              'Authorization': `Bearer ${(session as any).accessToken}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          Sentry.captureException(new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`));
          return NextResponse.json({ 
            error: 'Failed to fetch YouTube channel data',
            details: errorData.error?.message 
          }, { status: response.status });
        }

        const data = await response.json();
        
        if (!data.items || data.items.length === 0) {
          return NextResponse.json({ error: 'No YouTube channel found' }, { status: 404 });
        }

        const channel = data.items[0];
        const channelId = channel.id;

        // Get channel context with AI detection
        let channelContext = null;
        try {
          console.log('Fetching channel context for channel ID:', channelId);
          channelContext = await getChannelContext(channelId, (session as any).accessToken);
          console.log('Channel context result:', channelContext ? 'Success' : 'Failed');
          if (channelContext) {
            console.log('Channel context data:', {
              channelId: channelContext.channelData?.channelId,
              title: channelContext.channelData?.title,
              aiProbability: channelContext.aiIndicators?.aiProbability,
              confidence: channelContext.aiIndicators?.confidence
            });
          }
        } catch (contextError) {
          console.warn('Failed to get channel context:', contextError);
          // Continue without context - this is not critical
        }

        // Store channel data in Firestore
        const userRef = adminDb.collection('users').doc(session.user.id);
        await userRef.update({
          youtube: {
            channel: channel,
            connectedAt: new Date().toISOString(),
            channelContext: channelContext ? {
              channelData: channelContext.channelData,
              aiIndicators: {
                aiProbability: channelContext.aiIndicators.aiProbability,
                confidence: channelContext.aiIndicators.confidence,
                uploadConsistency: channelContext.aiIndicators.uploadConsistency,
                titleVariation: channelContext.aiIndicators.titleVariation,
                subToVideoRatio: channelContext.aiIndicators.subToVideoRatio,
                videosPerDay: channelContext.aiIndicators.videosPerDay,
              },
              lastUpdated: channelContext.lastUpdated,
            } : null,
          }
        });

        return NextResponse.json({ 
          success: true, 
          channel: channel,
          channelContext: channelContext ? {
            channelData: channelContext.channelData,
            aiIndicators: {
              aiProbability: channelContext.aiIndicators.aiProbability,
              confidence: channelContext.aiIndicators.confidence,
              uploadConsistency: channelContext.aiIndicators.uploadConsistency,
              titleVariation: channelContext.aiIndicators.titleVariation,
              subToVideoRatio: channelContext.aiIndicators.subToVideoRatio,
              videosPerDay: channelContext.aiIndicators.videosPerDay,
            },
            lastUpdated: channelContext.lastUpdated,
          } : null
        });

      } catch (error: any) {
        Sentry.captureException(error);
        console.error('Error fetching YouTube channel:', error);
        return NextResponse.json({ 
          error: 'Internal server error',
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
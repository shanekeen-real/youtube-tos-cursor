import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { getChannelContext } from '@/lib/channel-context';
import * as Sentry from "@sentry/nextjs";
import { Session } from 'next-auth';

// Extended session type for YouTube API integration
interface ExtendedSession extends Session {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

// Extended user type for Google account ID
interface ExtendedUser {
  googleAccountId?: string;
}

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

        if (!(session as ExtendedSession).accessToken) {
          return NextResponse.json({ error: 'No access token available' }, { status: 400 });
        }

        // Handle token refresh if needed
        let accessToken = (session as ExtendedSession).accessToken;
        let refreshToken = (session as ExtendedSession).refreshToken;
        let expiresAt = (session as ExtendedSession).expiresAt;
        
        // Ensure accessToken is available
        if (!accessToken) {
          return NextResponse.json({ error: 'No access token available' }, { status: 400 });
        }
        
        // Check if token is expired or about to expire (within 60 seconds)
        if (expiresAt && Date.now() / 1000 > expiresAt - 60 && refreshToken) {
          console.log('Token expired, attempting refresh for channel fetch...');
          try {
            const { refreshGoogleAccessToken } = await import('@/lib/auth');
            const refreshed = await refreshGoogleAccessToken(refreshToken);
            accessToken = refreshed.access_token;
            console.log('Token refreshed successfully for channel fetch');
          } catch (err) {
            console.error('Failed to refresh token for channel fetch:', err);
            return NextResponse.json({ 
              error: 'Failed to refresh access token. Please sign out and sign in again.' 
            }, { status: 401 });
          }
        }
        
        // Final check to ensure accessToken is available after potential refresh
        if (!accessToken) {
          return NextResponse.json({ error: 'No access token available after refresh' }, { status: 400 });
        }

        // Fetch YouTube channel data
        const response = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
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
          channelContext = await getChannelContext(channelId, accessToken);
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
        const userDoc = await userRef.get();
        // Fallback: migrate legacy doc if needed
        const googleAccountId = (session.user as ExtendedUser).googleAccountId || null;
        if (!userDoc.exists && googleAccountId && googleAccountId !== session.user.id) {
          const legacyRef = adminDb.collection('users').doc(googleAccountId);
          const legacyDoc = await legacyRef.get();
          if (legacyDoc.exists) {
            const legacyData = legacyDoc.data();
            await userRef.set({ ...legacyData, googleAccountId, migratedFrom: googleAccountId }, { merge: true });
            await legacyRef.delete();
          }
        }
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

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        Sentry.captureException(error);
        console.error('Error fetching YouTube channel:', errorMessage);
        return NextResponse.json({ 
          error: 'Internal server error',
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
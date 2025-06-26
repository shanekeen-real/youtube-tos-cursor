import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
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

        if (!session.accessToken) {
          return NextResponse.json({ error: 'No access token available' }, { status: 400 });
        }

        // Fetch YouTube channel data
        const response = await fetch(
          'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
          {
            headers: {
              'Authorization': `Bearer ${session.accessToken}`,
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

        // Store channel data in Firestore
        const userRef = adminDb.collection('users').doc(session.user.id);
        await userRef.update({
          youtube: {
            channel: channel,
            connectedAt: new Date().toISOString(),
          }
        });

        return NextResponse.json({ 
          success: true, 
          channel: channel 
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
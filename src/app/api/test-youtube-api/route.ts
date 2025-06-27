import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

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
        const results: any = {};

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
          results.channels = channelsData;
          console.log('Channels found:', channelsData.items?.length || 0);
        } else {
          results.channelsError = await channelsResponse.json();
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
          results.mineVideos = mineData;
          console.log('Mine videos found:', mineData.items?.length || 0);
        } else {
          results.mineError = await mineResponse.json();
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
          results.forMineVideos = forMineData;
          console.log('ForMine videos found:', forMineData.items?.length || 0);
        } else {
          results.forMineError = await forMineResponse.json();
        }

        // Test 4: Get videos with channelId if we have a channel
        if (results.channels?.items?.length > 0) {
          const channelId = results.channels.items[0].id;
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
            results.channelVideos = channelData;
            console.log('Channel videos found:', channelData.items?.length || 0);
          } else {
            results.channelError = await channelResponse.json();
          }
        }

        return NextResponse.json({ 
          success: true, 
          results,
          summary: {
            channelsFound: results.channels?.items?.length || 0,
            mineVideosFound: results.mineVideos?.items?.length || 0,
            forMineVideosFound: results.forMineVideos?.items?.length || 0,
            channelVideosFound: results.channelVideos?.items?.length || 0,
          }
        });
      } catch (error: any) {
        console.error('Error testing YouTube API:', error);
        Sentry.captureException(error);
        return NextResponse.json({ 
          error: 'Internal server error', 
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
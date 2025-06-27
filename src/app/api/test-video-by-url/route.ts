import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

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

        const { videoUrl } = await req.json();
        
        if (!videoUrl) {
          return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }

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
        const results: any = { videoId };

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
          results.videoDetails = videoData;
          console.log('Video details found:', videoData.items?.length || 0);
          
          if (videoData.items?.length > 0) {
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
          results.videoError = await videoResponse.json();
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
            results.channelInfo = channelData;
            console.log('Channel info found:', channelData.items?.length || 0);
          } else {
            results.channelError = await channelResponse.json();
          }
        }

        return NextResponse.json({ 
          success: true, 
          results,
          summary: {
            videoId,
            videoFound: results.videoDetails?.items?.length > 0,
            channelFound: results.channelInfo?.items?.length > 0,
            privacyStatus: results.videoInfo?.privacyStatus,
            channelTitle: results.videoInfo?.channelTitle,
          }
        });
      } catch (error: any) {
        console.error('Error testing video by URL:', error);
        Sentry.captureException(error);
        return NextResponse.json({ 
          error: 'Internal server error', 
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { refreshGoogleAccessToken } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/fetch-youtube-videos",
    },
    async () => {
      try {
        const session = await auth();
        
        // Add detailed logging for debugging
        console.log('Session data:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          hasUserId: !!session?.user?.id,
          hasAccessToken: !!session?.accessToken,
          hasRefreshToken: !!session?.refreshToken,
          expiresAt: session?.expiresAt,
          currentTime: Date.now() / 1000
        });

        if (!session?.user?.id) {
          console.log('No session or user ID found');
          return NextResponse.json({ error: 'Unauthorized - No session or user ID' }, { status: 401 });
        }

        if (!session?.accessToken) {
          console.log('No access token found in session');
          return NextResponse.json({ 
            error: 'Unauthorized - No access token. Please sign out and sign in again to refresh your tokens.' 
          }, { status: 401 });
        }

        let accessToken = session.accessToken;
        let refreshToken = session.refreshToken;
        let expiresAt = session.expiresAt;

        // Parse params
        const { pageToken = '', pageSize = 5 } = await req.json().catch(() => ({}));

        // Check if token is expired (expiresAt is in seconds)
        if (expiresAt && Date.now() / 1000 > expiresAt - 60 && refreshToken) {
          console.log('Token expired, attempting refresh...');
          try {
            const refreshed = await refreshGoogleAccessToken(refreshToken);
            accessToken = refreshed.access_token;
            console.log('Token refreshed successfully');
            // Optionally update session or DB with new token here
          } catch (err) {
            console.error('Failed to refresh token:', err);
            Sentry.captureException(err);
            return NextResponse.json({ 
              error: 'Failed to refresh access token. Please sign out and sign in again.' 
            }, { status: 401 });
          }
        } else if (expiresAt && Date.now() / 1000 > expiresAt - 60 && !refreshToken) {
          console.log('Token expired but no refresh token available');
          return NextResponse.json({ 
            error: 'Access token expired and no refresh token available. Please sign out and sign in again to get fresh tokens.' 
          }, { status: 401 });
        }

        // Fetch videos from YouTube API
        const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=${pageSize}&order=date${pageToken ? `&pageToken=${pageToken}` : ''}`;
        console.log('Fetching from YouTube API:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        console.log('YouTube API response status:', response.status);

        if (response.status === 401 && refreshToken) {
          // Try refreshing token and retrying once
          console.log('YouTube API returned 401, attempting token refresh...');
          try {
            const refreshed = await refreshGoogleAccessToken(refreshToken);
            accessToken = refreshed.access_token;
            const retryResponse = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            });
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json();
              console.error('Retry failed:', errorData);
              Sentry.captureException(new Error(`YouTube API error: ${errorData.error?.message || retryResponse.statusText}`));
              return NextResponse.json({ error: 'Failed to fetch videos after token refresh', details: errorData.error?.message }, { status: retryResponse.status });
            }
            const retryData = await retryResponse.json();
            return NextResponse.json({ success: true, ...retryData });
          } catch (err) {
            console.error('Token refresh on retry failed:', err);
            Sentry.captureException(err);
            return NextResponse.json({ error: 'Failed to refresh access token on retry' }, { status: 401 });
          }
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error('YouTube API error:', errorData);
          Sentry.captureException(new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`));
          // Handle quota errors
          if (response.status === 403 && errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
            return NextResponse.json({ error: 'YouTube API quota exceeded', details: errorData.error?.message }, { status: 429 });
          }
          return NextResponse.json({ error: 'Failed to fetch YouTube videos', details: errorData.error?.message }, { status: response.status });
        }

        const data = await response.json();
        console.log('Successfully fetched videos:', data.items?.length || 0, 'videos');
        console.log('Full YouTube API response:', JSON.stringify(data, null, 2));

        // Fetch video statistics and status for each video
        if (data.items && data.items.length > 0) {
          try {
            const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
            const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,status&id=${videoIds}`;
            
            const statsResponse = await fetch(statsUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            });

            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              console.log('Successfully fetched video statistics and status:', statsData.items?.length || 0, 'videos');
              
              // Merge statistics and status with video data
              const videosWithStats = data.items.map((video: any) => {
                const stats = statsData.items?.find((stat: any) => stat.id === video.id.videoId);
                return {
                  ...video,
                  statistics: stats?.statistics || null,
                  status: stats?.status || null
                };
              });
              
              return NextResponse.json({ 
                success: true, 
                ...data,
                items: videosWithStats
              });
            } else {
              console.warn('Failed to fetch video statistics/status, returning videos without status');
            }
          } catch (err) {
            console.warn('Error fetching video statistics/status:', err);
            Sentry.captureException(err);
          }
        }

        return NextResponse.json({ success: true, ...data });
      } catch (error: any) {
        console.error('Unexpected error in fetch-youtube-videos:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
      }
    }
  );
} 
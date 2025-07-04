import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { refreshGoogleAccessToken } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { usageTracker } from '@/lib/usage-tracker';
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

        // Check quota before making API calls
        const quotaCheck = await usageTracker.checkQuota('youtube');
        if (!quotaCheck.available) {
          console.warn('YouTube API quota exceeded:', quotaCheck.current, '/', quotaCheck.limit);
          return NextResponse.json({ 
            error: 'YouTube API quota exceeded for today. Please try again tomorrow.',
            details: `Used: ${quotaCheck.current}/${quotaCheck.limit} quota units`
          }, { status: 429 });
        }

        // Estimate quota cost (1 unit for search + 1 unit for statistics if needed)
        const estimatedCost = pageToken ? 1 : 2; // First page needs both calls
        if (quotaCheck.current + estimatedCost > quotaCheck.limit) {
          console.warn('Insufficient quota for this request:', quotaCheck.current + estimatedCost, '/', quotaCheck.limit);
          return NextResponse.json({ 
            error: 'Insufficient YouTube API quota for this request. Please try again later.',
            details: `Available: ${quotaCheck.limit - quotaCheck.current} units, needed: ${estimatedCost} units`
          }, { status: 429 });
        }

        // Check cache first (only for first page, no pageToken)
        if (!pageToken) {
          const cacheKey = `recent_videos_${session.user.id}`;
          const cacheRef = adminDb.collection('youtube_cache').doc(cacheKey);
          const cacheDoc = await cacheRef.get();
          
          if (cacheDoc.exists) {
            const cacheData = cacheDoc.data();
            if (cacheData) {
              const cacheAge = Date.now() - cacheData.timestamp.toMillis();
              const cacheAgeMinutes = cacheAge / (1000 * 60);
              
              // Use cache if less than 1 hour old
              if (cacheAgeMinutes < 60) {
                console.log('Using cached recent videos (age:', cacheAgeMinutes.toFixed(1), 'minutes)');
                return NextResponse.json({ 
                  success: true, 
                  ...cacheData.data,
                  cached: true
                });
              }
            }
          }
        }

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
        console.log('Using access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'No token');
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        console.log('YouTube API response status:', response.status);
        console.log('YouTube API response headers:', Object.fromEntries(response.headers.entries()));

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
              let errorData;
              try {
                errorData = await retryResponse.json();
              } catch (parseError) {
                console.error('Failed to parse retry error response:', parseError);
                errorData = { error: { message: `HTTP ${retryResponse.status}: ${retryResponse.statusText}` } };
              }
              console.error('Retry failed:', errorData);
              Sentry.captureException(new Error(`YouTube API error: ${errorData.error?.message || retryResponse.statusText}`));
              return NextResponse.json({ 
                error: 'Failed to fetch videos after token refresh', 
                details: errorData.error?.message || `HTTP ${retryResponse.status}: ${retryResponse.statusText}` 
              }, { status: retryResponse.status });
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
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('Failed to parse YouTube API error response:', parseError);
            errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
          }
          console.error('YouTube API error:', errorData);
          
          // Try fallback: fetch channel ID and use channelId parameter instead of forMine
          if (response.status === 403 || response.status === 400) {
            console.log('Trying fallback approach with channel ID...');
            try {
              // First get the channel ID
              const channelResponse = await fetch(
                'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json',
                  },
                }
              );
              
              if (channelResponse.ok) {
                const channelData = await channelResponse.json();
                if (channelData.items && channelData.items.length > 0) {
                  const channelId = channelData.items[0].id;
                  console.log('Found channel ID:', channelId);
                  
                  // Now fetch videos using channelId
                  const fallbackUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=${pageSize}&order=date${pageToken ? `&pageToken=${pageToken}` : ''}`;
                  console.log('Trying fallback URL:', fallbackUrl);
                  
                  const fallbackResponse = await fetch(fallbackUrl, {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Accept': 'application/json',
                    },
                  });
                  
                  if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    console.log('Fallback successful, found videos:', fallbackData.items?.length || 0);
                    return NextResponse.json({ success: true, ...fallbackData });
                  } else {
                    console.log('Fallback also failed:', fallbackResponse.status);
                  }
                }
              }
            } catch (fallbackError) {
              console.error('Fallback attempt failed:', fallbackError);
            }
          }
          
          Sentry.captureException(new Error(`YouTube API error: ${errorData.error?.message || response.statusText}`));
          // Handle quota errors
          if (response.status === 403 && errorData.error?.errors?.[0]?.reason === 'quotaExceeded') {
            return NextResponse.json({ error: 'YouTube API quota exceeded', details: errorData.error?.message }, { status: 429 });
          }
          return NextResponse.json({ 
            error: 'Failed to fetch YouTube videos', 
            details: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}` 
          }, { status: response.status });
        }

        const data = await response.json();
        console.log('Successfully fetched videos:', data.items?.length || 0, 'videos');
        console.log('Full YouTube API response:', JSON.stringify(data, null, 2));

        // Track quota usage for the search API call
        await usageTracker.trackUsage('youtube', 1);

        // Check if user has no videos
        if (!data.items || data.items.length === 0) {
          console.log('User has no videos uploaded to their channel');
          return NextResponse.json({ 
            success: true, 
            items: [],
            message: 'No videos found. Upload some videos to your YouTube channel to see them here.'
          });
        }

        // Cache the response for 1 hour (only for first page)
        if (!pageToken) {
          const cacheKey = `recent_videos_${session.user.id}`;
          const cacheRef = adminDb.collection('youtube_cache').doc(cacheKey);
          await cacheRef.set({
            data: data,
            timestamp: new Date(),
            userId: session.user.id
          });
          console.log('Cached recent videos for user:', session.user.id);
        }

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
              
              // Track quota usage for the statistics API call
              await usageTracker.trackUsage('youtube', 1);
              
              // Merge statistics and status with video data
              const videosWithStats = data.items.map((video: any) => {
                const stats = statsData.items?.find((stat: any) => stat.id === video.id.videoId);
                return {
                  ...video,
                  statistics: stats?.statistics || null,
                  status: stats?.status || null
                };
              });
              
              // Update cache with statistics data
              if (!pageToken) {
                const cacheKey = `recent_videos_${session.user.id}`;
                const cacheRef = adminDb.collection('youtube_cache').doc(cacheKey);
                await cacheRef.set({
                  data: { ...data, items: videosWithStats },
                  timestamp: new Date(),
                  userId: session.user.id
                });
                console.log('Updated cache with statistics data');
              }
              
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
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth, refreshGoogleAccessToken } from '@/lib/auth';
import { usageTracker } from '@/lib/usage-tracker';
import * as Sentry from "@sentry/nextjs";
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';

// Type definitions for YouTube API responses
interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet?: {
    title?: string;
  };
}

interface YouTubeVideoStats {
  id: string;
  statistics?: {
    viewCount?: string;
  };
  snippet?: {
    title?: string;
  };
}

interface VideoStats {
  viewCount: number;
  title: string;
}

interface ScanData {
  video_id?: string;
  analysisResult?: {
    riskLevel?: string;
    risk_level?: string;
  };
  timestamp?: Timestamp; // Firestore timestamp
  createdAt?: Timestamp; // Firestore timestamp
}

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/revenue-at-risk",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile to check CPM setup
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
          return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }
        const userData = userDoc.data();
        const userCpm = userData?.cpm;
        const userRpm = userData?.rpm;
        const monetizedPercent = typeof userData?.monetizedPercent === 'number' ? userData.monetizedPercent : 60;
        const includeCut = typeof userData?.includeCut === 'boolean' ? userData.includeCut : true;
        const isSetup = userData?.revenueCalculatorSetup;
        if (!isSetup || (!userCpm && !userRpm)) {
          return NextResponse.json({
            atRisk: 0,
            secured: 0,
            total: 0,
            details: [],
            setupRequired: true
          });
        }

        // Ensure access token is fresh
        let accessToken = session.accessToken;
        if (session.expiresAt && Date.now() / 1000 > session.expiresAt - 60 && session.refreshToken) {
          try {
            const refreshed = await refreshGoogleAccessToken(session.refreshToken);
            accessToken = refreshed.access_token;
          } catch (err) {
            console.error('Failed to refresh token for revenue calculation:', err);
            return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 });
          }
        }

        // 1. Check cache first for video data
        const channelId = userData?.youtube?.channel?.id;
        if (!channelId) {
          console.log('No YouTube channel ID found in user data:', {
            hasYoutube: !!userData?.youtube,
            hasChannel: !!userData?.youtube?.channel,
            channelId: userData?.youtube?.channel?.id
          });
          return NextResponse.json({ error: 'YouTube channel not connected' }, { status: 400 });
        }
        const cacheKey = `videos_${channelId}`;
        const cacheRef = adminDb.collection('youtube_cache').doc(cacheKey);
        const cacheDoc = await cacheRef.get();
        
        let allVideos: YouTubeVideo[] = [];
        let viewCounts = new Map<string, VideoStats>();
        
        if (cacheDoc.exists) {
          const cacheData = cacheDoc.data();
          if (cacheData) {
            const cacheAge = Date.now() - cacheData.timestamp.toMillis();
            const cacheAgeHours = cacheAge / (1000 * 60 * 60);
            
            // Use cache if less than 24 hours old
            if (cacheAgeHours < 24) {
              console.log('Using cached video data (age:', cacheAgeHours.toFixed(1), 'hours)');
              allVideos = cacheData.videos || [];
              viewCounts = new Map(Object.entries(cacheData.viewCounts || {}));
            }
          }
        }
        
        // If no cache or cache expired, fetch from YouTube API
        if (allVideos.length === 0) {
          console.log('Fetching fresh video data from YouTube API');
          
          // Check quota before making expensive API calls
          const quotaCheck = await usageTracker.checkQuota('youtube');
          if (!quotaCheck.available) {
            console.warn('YouTube API quota exceeded for revenue calculation:', quotaCheck.current, '/', quotaCheck.limit);
            return NextResponse.json({ 
              error: 'YouTube API quota exceeded for today. Revenue calculation will be available tomorrow.',
              details: `Used: ${quotaCheck.current}/${quotaCheck.limit} quota units`
            }, { status: 429 });
          }

          // Estimate quota cost (multiple API calls for videos + statistics)
          const estimatedCost = 10; // Conservative estimate for multiple API calls
          if (quotaCheck.current + estimatedCost > quotaCheck.limit) {
            console.warn('Insufficient quota for revenue calculation:', quotaCheck.current + estimatedCost, '/', quotaCheck.limit);
            return NextResponse.json({ 
              error: 'Insufficient YouTube API quota for revenue calculation. Please try again later.',
              details: `Available: ${quotaCheck.limit - quotaCheck.current} units, needed: ~${estimatedCost} units`
            }, { status: 429 });
          }
          
          let nextPageToken = '';
          do {
            const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=50&order=date${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const response = await fetch(apiUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            });
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error?.message || 'Failed to fetch videos from YouTube');
            }
            const data = await response.json();
            allVideos = allVideos.concat(data.items || []);
            nextPageToken = data.nextPageToken;
            
            // Track quota usage for search API call
            await usageTracker.trackUsage('youtube', 1);
          } while (nextPageToken && allVideos.length < 200); // Limit to 200 for performance

          // 2. Get view counts for all videos
          const videoIds = allVideos.map((v: YouTubeVideo) => v.id.videoId).filter(Boolean);
          for (let i = 0; i < videoIds.length; i += 50) {
            const chunk = videoIds.slice(i, i + 50);
            const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${chunk.join(',')}`;
            const statsResponse = await fetch(statsUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            });
            if (statsResponse.ok) {
              const statsData = await statsResponse.json();
              statsData.items?.forEach((item: YouTubeVideoStats) => {
                viewCounts.set(item.id, {
                  viewCount: parseInt(item.statistics?.viewCount || '0'),
                  title: item.snippet?.title || 'Untitled',
                });
              });
              
              // Track quota usage for statistics API call
              await usageTracker.trackUsage('youtube', 1);
            }
          }
          
          // Cache the results for 24 hours
          await cacheRef.set({
            videos: allVideos,
            viewCounts: Object.fromEntries(viewCounts),
            timestamp: new Date(),
            channelId: channelId
          });
          console.log('Cached video data for channel:', channelId);
        }

        // Get video IDs for revenue calculation
        const videoIds = allVideos.map((v: YouTubeVideo) => v.id.videoId).filter(Boolean);

        // 3. For each video, check Firestore for latest scan result
        const scanSnaps = await adminDb.collection('analysis_cache')
          .where('userId', '==', userId)
          .where('isCache', '==', false)
          .get();
        const scanMap = new Map();
        scanSnaps.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data() as ScanData;
          const videoId = data.video_id;
          const timestamp = data.timestamp?.toDate?.() || data.timestamp || data.createdAt || new Date();
          const prev = scanMap.get(videoId);
          if (!prev || (timestamp > prev.timestamp)) {
            scanMap.set(videoId, {
              riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || 'Unknown',
              timestamp,
            });
          }
        });

        // 4. Calculate revenue and aggregate
        let atRisk = 0;
        let secured = 0;
        let total = 0;
        const details = [];
        for (const videoId of videoIds) {
          const stats = viewCounts.get(videoId) || { viewCount: 0, title: 'Untitled' };
          let revenue = 0;
          if (typeof userRpm === 'number' && !isNaN(userRpm)) {
            // Use RPM: revenue = (views * RPM) / 1000
            revenue = (stats.viewCount * userRpm) / 1000;
          } else if (typeof userCpm === 'number' && !isNaN(userCpm)) {
            // Use CPM: revenue = (views * monetizedPercent/100 * (includeCut ? 0.55 : 1) * CPM) / 1000
            revenue = (stats.viewCount * (monetizedPercent / 100) * (includeCut ? 0.55 : 1) * userCpm) / 1000;
          }
          total += revenue;
          const scan = scanMap.get(videoId);
          let riskLevel = 'Unknown';
          if (scan) {
            riskLevel = scan.riskLevel;
          }
          if (riskLevel === 'LOW') {
            secured += revenue;
          } else {
            atRisk += revenue;
          }
          details.push({
            videoId,
            title: stats.title,
            earnings: revenue,
            riskLevel,
            cpm: userCpm,
            rpm: userRpm,
            monetizedPercent,
            includeCut,
            viewCount: stats.viewCount,
            timestamp: scan?.timestamp || null,
          });
        }

        return NextResponse.json({
          atRisk: parseFloat(atRisk.toFixed(2)),
          secured: parseFloat(secured.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          details,
          setupRequired: false
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error in /api/revenue-at-risk:', errorMessage);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Failed to calculate revenue at risk', details: errorMessage }, { status: 500 });
      }
    }
  );
} 
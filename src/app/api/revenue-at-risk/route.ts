import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth, refreshGoogleAccessToken } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

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
        const isSetup = userData?.revenueCalculatorSetup;
        if (!isSetup || !userCpm) {
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

        // 1. Fetch all videos from the user's YouTube channel
        // (Assume channelId is stored in userData.youtube.channel.id)
        const channelId = userData?.youtube?.channel?.id;
        if (!channelId) {
          return NextResponse.json({ error: 'YouTube channel not connected' }, { status: 400 });
        }
        let allVideos: any[] = [];
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
        } while (nextPageToken && allVideos.length < 200); // Limit to 200 for performance

        // 2. Get view counts for all videos
        const videoIds = allVideos.map((v: any) => v.id.videoId).filter(Boolean);
        const viewCounts = new Map();
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
            statsData.items?.forEach((item: any) => {
              viewCounts.set(item.id, {
                viewCount: parseInt(item.statistics?.viewCount || '0'),
                title: item.snippet?.title || 'Untitled',
              });
            });
          }
        }

        // 3. For each video, check Firestore for latest scan result
        const scanSnaps = await adminDb.collection('analysis_cache')
          .where('userId', '==', userId)
          .where('isCache', '==', false)
          .get();
        const scanMap = new Map();
        scanSnaps.docs.forEach(doc => {
          const data = doc.data();
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
          const revenue = (stats.viewCount * userCpm) / 1000;
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
      } catch (error: any) {
        console.error('Error in /api/revenue-at-risk:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Failed to calculate revenue at risk', details: error.message }, { status: 500 });
      }
    }
  );
} 
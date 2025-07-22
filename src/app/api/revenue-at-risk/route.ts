import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth, refreshGoogleAccessToken } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { getCachedYouTubeData, fetchAndCacheYouTubeData } from '@/lib/revenue/youtube-service';
import { calculateRevenueAtRisk } from '@/lib/revenue/revenue-calculator';

// Type definitions for YouTube API responses
export interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet?: {
    title?: string;
  };
}

export interface YouTubeVideoStats {
  id: string;
  statistics?: {
    viewCount?: string;
  };
  snippet?: {
    title?: string;
  };
}

export interface VideoStats {
  viewCount: number;
  title: string;
}

export interface ScanData {
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
        if (!accessToken || typeof accessToken !== 'string') {
          return NextResponse.json({ error: 'Missing or invalid access token' }, { status: 401 });
        }

        // Get channel ID
        const channelId = userData?.youtube?.channel?.id;
        if (!channelId || typeof channelId !== 'string') {
          return NextResponse.json({ error: 'YouTube channel not connected' }, { status: 400 });
        }

        // 1. Try cache first
        let youTubeData = await getCachedYouTubeData(channelId as string);
        if (!youTubeData) {
          youTubeData = await fetchAndCacheYouTubeData({ channelId: channelId as string, accessToken });
        }
        const { videos: allVideos, viewCounts } = youTubeData;
        const videoIds = allVideos.map((v: YouTubeVideo) => v.id.videoId).filter(Boolean);

        // 2. For each video, check Firestore for latest scan result
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

        // 3. Calculate revenue and aggregate
        const result = calculateRevenueAtRisk({
          videoIds,
          viewCounts,
          scanMap,
          userCpm,
          userRpm,
          monetizedPercent,
          includeCut,
        });

        return NextResponse.json({
          ...result,
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
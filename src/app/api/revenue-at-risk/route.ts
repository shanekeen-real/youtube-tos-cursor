import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
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

        // Fetch all user videos from Firestore (analysis_cache)
        const cacheRef = adminDb.collection('analysis_cache');
        const userVideosSnap = await cacheRef
          .where('userId', '==', userId)
          .where('isCache', '==', false)
          .get();

        // Map to keep only the latest scan for each video
        const videoMap = new Map();
        userVideosSnap.docs.forEach(doc => {
          const data = doc.data();
          const videoId = data.video_id;
          if (!videoId) return;
          const timestamp = data.timestamp?.toDate?.() || data.timestamp || data.createdAt || new Date();
          const prev = videoMap.get(videoId);
          if (!prev || (timestamp > prev.timestamp)) {
            videoMap.set(videoId, {
              videoId,
              title: data.analysisResult?.title || data.title || 'Untitled',
              riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || 'Unknown',
              estimatedEarnings: data.analysisResult?.estimatedEarnings || data.estimatedEarnings || 0,
              cpm: data.analysisResult?.cpm || data.cpm || 3.0,
              timestamp,
            });
          }
        });

        let atRisk = 0;
        let secured = 0;
        let total = 0;
        const details = [];
        for (const video of videoMap.values()) {
          total += video.estimatedEarnings;
          if (video.riskLevel === 'LOW') {
            secured += video.estimatedEarnings;
          } else {
            atRisk += video.estimatedEarnings;
          }
          details.push({
            videoId: video.videoId,
            title: video.title,
            earnings: video.estimatedEarnings,
            riskLevel: video.riskLevel,
            cpm: video.cpm,
            timestamp: video.timestamp,
          });
        }

        return NextResponse.json({
          atRisk: parseFloat(atRisk.toFixed(2)),
          secured: parseFloat(secured.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          details,
        });
      } catch (error: any) {
        console.error('Error in /api/revenue-at-risk:', error);
        Sentry.captureException(error);
        return NextResponse.json({ error: 'Failed to calculate revenue at risk', details: error.message }, { status: 500 });
      }
    }
  );
} 
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/get-video-scans",
    },
    async () => {
      try {
        const { searchParams } = new URL(req.url);
        const videoId = searchParams.get('videoId');
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!videoId) {
          return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
        }

        // Query all scans for this specific video and user
        const cacheRef = adminDb.collection('analysis_cache');
        const videoScans = await cacheRef
          .where('userId', '==', userId)
          .where('video_id', '==', videoId)
          .get();

        const scans = videoScans.docs
          .filter(doc => !doc.data().isCache) // Exclude cache docs
          .map(doc => {
            const data = doc.data();
            return {
              scanId: doc.id,
              videoId: data.video_id,
              riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || 'Unknown',
              riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score || 0,
              title: data.analysisResult?.title || 'Untitled',
              timestamp: data.timestamp?.toDate() || data.createdAt || new Date(),
              url: data.original_url || `https://www.youtube.com/watch?v=${videoId}`,
              analysisSource: data.analysisResult?.analysis_source || 'Unknown'
            };
          });

        // Sort by timestamp (newest first)
        scans.sort((a, b) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({
          videoId,
          scans,
          totalScans: scans.length
        });

      } catch (error: any) {
        console.error('Error fetching video scans:', error);
        Sentry.captureException(error);
        
        return NextResponse.json({ 
          error: 'Failed to fetch video scans',
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
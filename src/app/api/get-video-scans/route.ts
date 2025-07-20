import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';

// Type definitions for video scan data
interface VideoScanData {
  video_id?: string;
  isCache?: boolean;
  analysisResult?: {
    riskLevel?: string;
    risk_level?: string;
    riskScore?: number;
    risk_score?: number;
    title?: string;
    analysis_source?: string;
  };
  timestamp?: Timestamp; // Firestore timestamp
  createdAt?: Timestamp; // Firestore timestamp
  original_url?: string;
}

interface VideoScanResult {
  scanId: string;
  videoId: string;
  riskLevel: string;
  riskScore: number;
  title: string;
  timestamp: Date;
  url: string;
  analysisSource: string;
}

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
          .filter((doc: QueryDocumentSnapshot<DocumentData>) => !(doc.data() as VideoScanData).isCache) // Exclude cache docs
          .map((doc: QueryDocumentSnapshot<DocumentData>) => {
            const data = doc.data() as VideoScanData;
            return {
              scanId: doc.id,
              videoId: data.video_id || '',
              riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || 'Unknown',
              riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score || 0,
              title: data.analysisResult?.title || 'Untitled',
              timestamp: data.timestamp?.toDate() || data.createdAt || new Date(),
              url: data.original_url || `https://www.youtube.com/watch?v=${videoId}`,
              analysisSource: data.analysisResult?.analysis_source || 'Unknown'
            } as VideoScanResult;
          });

        // Sort by timestamp (newest first)
        scans.sort((a: VideoScanResult, b: VideoScanResult) => {
          const dateA = new Date(a.timestamp);
          const dateB = new Date(b.timestamp);
          return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({
          videoId,
          scans,
          totalScans: scans.length
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching video scans:', errorMessage);
        Sentry.captureException(error);
        
        return NextResponse.json({ 
          error: 'Failed to fetch video scans',
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
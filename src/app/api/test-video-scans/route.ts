import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';

// Type definitions for video scan data
interface VideoScanData {
  video_id?: string;
  analysisResult?: {
    riskLevel?: string;
    risk_level?: string;
    riskScore?: number;
    risk_score?: number;
  };
  timestamp?: Timestamp;
  original_url?: string;
}

interface VideoScan {
  scanId: string;
  riskLevel: string;
  riskScore: number;
  timestamp: Date | null;
  url: string;
}

interface VideoWithMultipleScans {
  videoId: string;
  scanCount: number;
  scans: VideoScan[];
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get a sample of cached analyses for this user
    const cacheRef = adminDb.collection('analysis_cache');
    const userAnalyses = await cacheRef
      .where('userId', '==', userId)
      .limit(5)
      .get();

    const videoScans = new Map<string, VideoScan[]>();
    
    userAnalyses.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data() as VideoScanData;
      const videoId = data.video_id;
      
      if (videoId) {
        if (!videoScans.has(videoId)) {
          videoScans.set(videoId, []);
        }
        
        videoScans.get(videoId)!.push({
          scanId: doc.id,
          riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || 'Unknown',
          riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score || 0,
          timestamp: data.timestamp?.toDate() || null,
          url: data.original_url || `https://www.youtube.com/watch?v=${videoId}`
        });
      }
    });

    // Convert to array and find videos with multiple scans
    const videosWithMultipleScans: VideoWithMultipleScans[] = Array.from(videoScans.entries())
      .filter(([videoId, scans]) => scans.length > 1)
      .map(([videoId, scans]) => ({
        videoId,
        scanCount: scans.length,
        scans: scans.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.getTime() - a.timestamp.getTime();
        })
      }));

    return NextResponse.json({ 
      message: 'Video scans test endpoint',
      userId,
      totalVideos: videoScans.size,
      videosWithMultipleScans: videosWithMultipleScans.slice(0, 3) // Return first 3 examples
    });

  } catch (error: unknown) {
    console.error('Error in test endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Test failed',
      details: errorMessage 
    }, { status: 500 });
  }
} 
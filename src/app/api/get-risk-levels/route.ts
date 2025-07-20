import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";

// Type definitions for analysis cache data
interface AnalysisCacheData {
  video_id?: string;
  analysisResult?: {
    riskLevel?: string;
    risk_level?: string;
    riskScore?: number;
    risk_score?: number;
  };
  timestamp?: Timestamp;
}

interface VideoAnalysis {
  analysis: AnalysisCacheData['analysisResult'];
  scanId: string;
  timestamp: Timestamp | null;
}

interface RiskLevelInfo {
  riskLevel: string;
  riskScore: number;
  scanId?: string;
}

interface RiskLevelsResponse {
  [videoId: string]: RiskLevelInfo | null;
}

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/get-risk-levels",
    },
    async () => {
      try {
        const { videoIds } = await req.json();
        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!Array.isArray(videoIds)) {
          return NextResponse.json({ error: 'videoIds must be an array' }, { status: 400 });
        }

        const riskLevels: RiskLevelsResponse = {};

        // Query the analysis cache for this user (without orderBy to avoid index requirement)
        const cacheRef = adminDb.collection('analysis_cache');
        
        // Get all cached analyses for this user
        const userAnalyses = await cacheRef
          .where('userId', '==', userId)
          .get();

        // Create a map of video IDs to their latest analysis
        const videoAnalysisMap = new Map<string, VideoAnalysis>();
        
        userAnalyses.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data() as AnalysisCacheData;
          const videoId = data.video_id;
          
          // Only store the latest analysis for each video (sort by timestamp in memory)
          if (videoId) {
            const existing = videoAnalysisMap.get(videoId);
            if (!existing || (data.timestamp && existing.timestamp && 
                data.timestamp.toMillis() > existing.timestamp.toMillis())) {
              videoAnalysisMap.set(videoId, {
                analysis: data.analysisResult,
                scanId: doc.id,
                timestamp: data.timestamp || null
              });
            }
          }
        });

        // Return risk levels for requested video IDs
        videoIds.forEach((videoId: string) => {
          const latestAnalysis = videoAnalysisMap.get(videoId);
          if (latestAnalysis) {
            riskLevels[videoId] = {
              riskLevel: latestAnalysis.analysis?.riskLevel || latestAnalysis.analysis?.risk_level || 'Unknown',
              riskScore: latestAnalysis.analysis?.riskScore || latestAnalysis.analysis?.risk_score || 0,
              scanId: latestAnalysis.scanId
            };
          } else {
            riskLevels[videoId] = null;
          }
        });

        return NextResponse.json({ riskLevels });

      } catch (error: unknown) {
        console.error('Error fetching risk levels:', error);
        Sentry.captureException(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        
        return NextResponse.json({ 
          error: 'Failed to fetch risk levels',
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
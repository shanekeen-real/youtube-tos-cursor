import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import { Session } from 'next-auth';

// Type definitions for scan history data
interface ScanHistoryData extends DocumentData {
  original_url?: string;
  url?: string;
  analysisResult?: {
    title?: string;
    riskLevel?: string;
    risk_level?: string;
    riskScore?: number;
    risk_score?: number;
  };
  title?: string;
  riskLevel?: string;
  riskScore?: number;
  timestamp?: Timestamp;
  createdAt?: Timestamp;
  video_id?: string;
  userEmail?: string;
}

interface ScanHistoryResult {
  id: string;
  url: string;
  title: string;
  riskLevel: string;
  riskScore: number;
  createdAt: string;
  status: string;
  videoId: string | null;
  userEmail: string | null;
}

export async function GET(req: NextRequest) {
  let session: Session | null = null;
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/get-scan-history",
    },
    async () => {
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Query all scans for this user, excluding cache documents
        const cacheRef = adminDb.collection('analysis_cache');
        const userScans = await cacheRef
          .where('userId', '==', userId)
          .where('isCache', '==', false) // Exclude cache documents
          .orderBy('timestamp', 'desc')
          .get();

        const scans = userScans.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data() as ScanHistoryData;
          
          // Handle timestamp conversion properly
          let dateObject: Date;
          if (data.timestamp?.toDate) {
            dateObject = data.timestamp.toDate();
          } else if (data.createdAt?.toDate) {
            dateObject = data.createdAt.toDate();
          } else if (data.timestamp) {
            dateObject = new Date(data.timestamp.toMillis());
          } else if (data.createdAt) {
            dateObject = new Date(data.createdAt.toMillis());
          } else {
            dateObject = new Date();
          }
          
          return {
            id: doc.id,
            url: data.original_url || data.url || '',
            title: data.analysisResult?.title || data.title || 'Untitled',
            riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || data.riskLevel || 'Unknown',
            riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score || data.riskScore || 0,
            createdAt: dateObject.toISOString(),
            status: 'completed',
            videoId: data.video_id || null,
            userEmail: data.userEmail || null
          } as ScanHistoryResult;
        });

        return NextResponse.json({ 
          scans,
          totalCount: scans.length
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching scan history:', errorMessage);
        Sentry.captureException(error, {
          tags: { component: 'scan-history-api', action: 'fetch-scans' },
          extra: { userId: session?.user?.id }
        });
        
        return NextResponse.json({ 
          error: 'Failed to fetch scan history',
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  let session;
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

        const scans = userScans.docs.map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate?.() || data.timestamp || data.createdAt || new Date();
          
          return {
            id: doc.id,
            url: data.original_url || data.url || '',
            title: data.analysisResult?.title || data.title || 'Untitled',
            riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || data.riskLevel || 'Unknown',
            riskScore: data.analysisResult?.riskScore || data.analysisResult?.risk_score || data.riskScore || 0,
            createdAt: timestamp.toISOString ? timestamp.toISOString() : timestamp,
            status: 'completed',
            videoId: data.video_id || null,
            userEmail: data.userEmail || null
          };
        });

        return NextResponse.json({ 
          scans,
          totalCount: scans.length
        });

      } catch (error: any) {
        console.error('Error fetching scan history:', error);
        Sentry.captureException(error, {
          tags: { component: 'scan-history-api', action: 'fetch-scans' },
          extra: { userId: session?.user?.id }
        });
        
        return NextResponse.json({ 
          error: 'Failed to fetch scan history',
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
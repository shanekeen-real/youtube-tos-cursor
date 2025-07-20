import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import { Session } from 'next-auth';
import { Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";
import type { SubscriptionTier } from '@/types/subscription';

// Type definitions for scan data
interface ScanData {
  userId?: string;
  analysisResult?: {
    riskLevel?: string;
    risk_level?: string;
    riskScore?: number;
    risk_score?: number;
    suggestions?: Array<{
      id?: string;
      title?: string;
      description?: string;
      category?: string;
      priority?: string;
    }>;
    allSuggestionsCount?: number;
  };
  video_id?: string;
  original_url?: string;
  timestamp?: Timestamp;
  createdAt?: Timestamp;
}

interface UserData {
  subscriptionTier?: SubscriptionTier;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get('scanId');
  let session: Session | null;
  
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/get-scan-details",
    },
    async () => {
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!scanId) {
          return NextResponse.json({ error: 'scanId is required' }, { status: 400 });
        }

        // Get the scan document
        const scanRef = adminDb.collection('analysis_cache').doc(scanId);
        const scanDoc = await scanRef.get();

        if (!scanDoc.exists) {
          return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }

        const scanData = scanDoc.data() as ScanData;

        // Security check: ensure the user owns this scan
        if (scanData?.userId && scanData.userId !== userId) {
          return NextResponse.json({ error: 'Unauthorized access to scan' }, { status: 403 });
        }

        // Enforce suggestion limit based on user tier
        let userTier = 'free';
        let allSuggestionsCount = undefined;
        try {
          const userRef = adminDb.collection('users').doc(userId);
          const userDoc = await userRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data() as UserData;
            userTier = userData?.subscriptionTier || 'free';
          }
        } catch (tierError) {
          console.error('Error fetching user tier:', tierError);
        }
        // Import getTierLimits dynamically to avoid circular deps if needed
        const { getTierLimits } = await import('@/types/subscription');
        const limits = getTierLimits(userTier as SubscriptionTier);
        if (scanData?.analysisResult?.suggestions) {
          allSuggestionsCount = scanData.analysisResult.suggestions.length;
          // REMOVED: Do not slice suggestions array here; let frontend handle upsell/blur logic
          scanData.analysisResult.allSuggestionsCount = allSuggestionsCount;
        }

        return NextResponse.json(scanData);

      } catch (error: unknown) {
        console.error('Error fetching scan details:', error);
        Sentry.captureException(error, {
          tags: { component: 'get-scan-details', action: 'fetch-scan' },
          extra: { scanId: scanId, userId: session?.user?.id }
        });
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        
        return NextResponse.json({ 
          error: 'Failed to fetch scan details',
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
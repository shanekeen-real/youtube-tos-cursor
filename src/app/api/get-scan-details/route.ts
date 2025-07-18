import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";
import type { SubscriptionTier } from '@/types/subscription';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get('scanId');
  let session: any;
  
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

        const scanData = scanDoc.data();

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
            const userData = userDoc.data();
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

      } catch (error: any) {
        console.error('Error fetching scan details:', error);
        Sentry.captureException(error, {
          tags: { component: 'get-scan-details', action: 'fetch-scan' },
          extra: { scanId: scanId, userId: session?.user?.id }
        });
        
        return NextResponse.json({ 
          error: 'Failed to fetch scan details',
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
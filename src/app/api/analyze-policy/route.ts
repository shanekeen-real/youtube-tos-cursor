import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: NextRequest) {
  let session;
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/analyze-policy",
    },
    async () => {
      try {
        session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { text } = await req.json();

        if (!text) {
          return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        // Check user's scan limit
        let userRef;
        try {
          userRef = adminDb.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.scanCount >= userData?.scanLimit) {
              return NextResponse.json({ 
                error: 'You have reached your free scan limit. Please upgrade for unlimited scans.' 
              }, { status: 429 });
            }
          }
        } catch (limitError) {
          console.error('Error checking scan limit:', limitError);
          // Continue with analysis even if limit check fails
        }
        
        const analysisResult = await performEnhancedAnalysis(text);

        // Save scan to history using server-side Firebase Admin
        try {
          const scanRef = await adminDb.collection('analysis_cache').add({
            analysisResult: analysisResult,
            timestamp: new Date(),
            original_text: text.substring(0, 500), // Store text snippet
            userId: userId,
            userEmail: session?.user?.email,
            isCache: false, // Mark as history scan, not cache
          });

          // Increment user's scan count if userRef exists
          if (userRef) {
            await userRef.update({
              scanCount: FieldValue.increment(1)
            });
          }

          console.log(`HISTORY: Saved new policy scan to history for user ${userId}`);

          return NextResponse.json({
            ...analysisResult,
            mode: 'enhanced',
            source: 'gemini-1.5-flash-latest',
            scanId: scanRef.id
          });
        } catch (saveError) {
          console.error('Failed to save scan to history:', saveError);
          Sentry.captureException(saveError, {
            tags: { component: 'analyze-policy', action: 'save-history' },
            extra: { userId }
          });
          
          // Return analysis result even if save fails
          return NextResponse.json({
            ...analysisResult,
            mode: 'enhanced',
            source: 'gemini-1.5-flash-latest'
          });
        }

      } catch (error: any) {
        console.error('Enhanced Analysis API error:', error);
        
        // Track API errors with Sentry
        Sentry.captureException(error, {
          tags: { component: 'api', endpoint: 'analyze-policy' },
          extra: { 
            hasText: !!req.body,
            userAgent: req.headers.get('user-agent'),
            userId: session?.user?.id
          }
        });
        
        return NextResponse.json({
          error: 'AI analysis failed',
          details: error instanceof Error ? error.message : 'An unknown error occurred.'
        }, { status: 500 });
      }
    }
  );
} 
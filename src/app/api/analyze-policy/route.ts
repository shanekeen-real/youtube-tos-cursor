import { NextRequest, NextResponse } from 'next/server';
import { performEnhancedAnalysis } from '@/lib/ai-analysis';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, DocumentData, Timestamp } from 'firebase-admin/firestore';
import * as Sentry from '@sentry/nextjs';
import { checkUserCanScan, checkSuggestionsPerScan } from '@/lib/subscription-utils';
import { getTierLimits, SubscriptionTier } from '@/types/subscription';
import { Session } from 'next-auth';

// Type definition for user data from Firestore
interface UserData extends DocumentData {
  subscriptionTier?: SubscriptionTier;
  scanCount?: number;
  lastScanAt?: Timestamp; // Firestore timestamp
}

// Type for subscription check - ensures compatibility with checkUserCanScan
type UserDataForSubscription = {
  subscriptionTier: SubscriptionTier;
  scanCount: number;
};

export async function POST(req: NextRequest) {
  let session: Session | null = null;
  let text: string | undefined = undefined;
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

        const body = await req.json();
        text = body.text;

        if (!text) {
          return NextResponse.json({ error: 'No text provided' }, { status: 400 });
        }

        // Check user's scan limit and get subscription data
        let userRef;
        let userData: UserData | null = null;
        try {
          userRef = adminDb.collection('users').doc(userId);
          const userDoc = await userRef.get();
          
          if (userDoc.exists) {
            userData = userDoc.data() as UserData;
            if (userData && userData.subscriptionTier && typeof userData.scanCount === 'number') {
              const canScan = checkUserCanScan(userData as UserDataForSubscription);
              
              if (!canScan.canScan) {
                return NextResponse.json({ 
                  error: canScan.reason || 'You have reached your scan limit. Please upgrade for unlimited scans.' 
                }, { status: 429 });
              }
            }
          }
        } catch (limitError) {
          console.error('Error checking scan limit:', limitError);
          // Continue with analysis even if limit check fails
        }
        
        const analysisResult = await performEnhancedAnalysis(text);

        // Apply subscription tier limitations
        let userTier = userData?.subscriptionTier || 'free'; // Default to free if not set
        const limits = getTierLimits(userTier);
        
        console.log(`[DEBUG] User tier: ${userTier}, suggestions limit: ${limits.suggestionsPerScan}`);
        console.log(`[DEBUG] Original suggestions count: ${analysisResult.suggestions?.length || 0}`);
        
        // Limit suggestions based on subscription tier
        if (limits.suggestionsPerScan !== 'all' && analysisResult.suggestions) {
          const maxSuggestions = limits.suggestionsPerScan;
          console.log(`[DEBUG] Max suggestions allowed: ${maxSuggestions}`);
          
          if (analysisResult.suggestions.length > maxSuggestions) {
            console.log(`[DEBUG] Limiting suggestions from ${analysisResult.suggestions.length} to ${maxSuggestions}`);
            analysisResult.suggestions = analysisResult.suggestions.slice(0, maxSuggestions);
          }
        }
        
        console.log(`[DEBUG] Final suggestions count: ${analysisResult.suggestions?.length || 0}`);

        // Increment scan count
        if (userRef && userData) {
          try {
            await userRef.update({
              scanCount: FieldValue.increment(1),
              lastScanAt: new Date()
            });
          } catch (updateError) {
            console.error('Error updating scan count:', updateError);
            // Continue even if scan count update fails
          }
        }

        return NextResponse.json(analysisResult);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Analysis error:', errorMessage);
        
        Sentry.captureException(error, {
          tags: { component: 'analyze-policy-api' },
          extra: { 
            userId: session?.user?.id,
            textLength: text?.length 
          }
        });

        return NextResponse.json({ 
          error: 'Analysis failed. Please try again.' 
        }, { status: 500 });
      }
    }
  );
} 
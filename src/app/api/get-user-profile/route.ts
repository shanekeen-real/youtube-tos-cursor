import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/get-user-profile",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile using Admin SDK (bypasses security rules)
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return NextResponse.json({ 
            error: 'User profile not found' 
          }, { status: 404 });
        }

        const userData = userDoc.data();
        
        // Return user profile data
        return NextResponse.json({
          userProfile: userData
        });
        
      } catch (error: unknown) {
        console.error('Error in get-user-profile:', error);
        Sentry.captureException(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ 
          error: 'Failed to get user profile', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
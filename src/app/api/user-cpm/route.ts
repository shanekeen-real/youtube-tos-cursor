import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/user-cpm",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          return NextResponse.json({ 
            error: 'User profile not found' 
          }, { status: 404 });
        }

        const userData = userDoc.data();
        
        return NextResponse.json({
          cpm: userData?.cpm || null,
          revenueCalculatorSetup: userData?.revenueCalculatorSetup || false
        });
      } catch (error: any) {
        console.error('Error in user-cpm:', error);
        Sentry.captureException(error);
        return NextResponse.json({ 
          error: 'Failed to get user CPM settings', 
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
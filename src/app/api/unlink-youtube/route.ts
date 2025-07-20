import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/unlink-youtube",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Update user profile to remove YouTube data using Admin SDK
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          youtube: null
        });
        
        return NextResponse.json({ success: true });
        
      } catch (error: unknown) {
        console.error('Error in unlink-youtube:', error);
        Sentry.captureException(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ 
          error: 'Failed to unlink YouTube', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
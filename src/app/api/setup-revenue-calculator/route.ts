import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import * as Sentry from "@sentry/nextjs";

export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "POST /api/setup-revenue-calculator",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { cpm } = await req.json();
        
        // Validate CPM value
        if (typeof cpm !== 'number' || cpm < 0.1 || cpm > 20) {
          return NextResponse.json({ 
            error: 'Invalid CPM value. Must be between $0.10 and $20.00' 
          }, { status: 400 });
        }

        // Update user profile with CPM and setup status
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          cpm: cpm,
          revenueCalculatorSetup: true,
          updatedAt: new Date()
        });

        return NextResponse.json({ 
          success: true, 
          message: 'Revenue calculator setup completed',
          cpm: cpm 
        });
      } catch (error: any) {
        console.error('Error in setup-revenue-calculator:', error);
        Sentry.captureException(error);
        return NextResponse.json({ 
          error: 'Failed to setup revenue calculator', 
          details: error.message 
        }, { status: 500 });
      }
    }
  );
} 
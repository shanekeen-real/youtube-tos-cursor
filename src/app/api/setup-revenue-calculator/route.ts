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

        const { cpm, rpm, monetizedPercent, includeCut } = await req.json();
        // Validate input: must have either CPM or RPM, not both null
        if ((typeof cpm !== 'number' || isNaN(cpm)) && (typeof rpm !== 'number' || isNaN(rpm))) {
          return NextResponse.json({ error: 'You must provide either a CPM or RPM value.' }, { status: 400 });
        }
        if (typeof cpm === 'number' && (cpm < 0.1 || cpm > 20)) {
          return NextResponse.json({ error: 'Invalid CPM value. Must be between $0.10 and $20.00' }, { status: 400 });
        }
        if (typeof rpm === 'number' && (rpm < 0.1 || rpm > 20)) {
          return NextResponse.json({ error: 'Invalid RPM value. Must be between $0.10 and $20.00' }, { status: 400 });
        }
        // Validate monetizedPercent
        let monetized = typeof monetizedPercent === 'number' && !isNaN(monetizedPercent) ? Math.max(10, Math.min(100, monetizedPercent)) : 60;
        // Validate includeCut
        let cut = typeof includeCut === 'boolean' ? includeCut : true;
        // Update user profile with all values
        const userRef = adminDb.collection('users').doc(userId);
        await userRef.update({
          cpm: typeof cpm === 'number' && !isNaN(cpm) ? cpm : null,
          rpm: typeof rpm === 'number' && !isNaN(rpm) ? rpm : null,
          monetizedPercent: monetized,
          includeCut: cut,
          revenueCalculatorSetup: true,
          updatedAt: new Date()
        });
        return NextResponse.json({
          success: true,
          message: 'Revenue calculator setup completed',
          cpm,
          rpm,
          monetizedPercent: monetized,
          includeCut: cut
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
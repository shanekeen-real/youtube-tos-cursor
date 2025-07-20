import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from "@sentry/nextjs";

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/env-check",
    },
    async () => {
      try {
        // Check for required environment variables
        const envCheck = {
          hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
          hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV,
        };

        // Don't expose sensitive values, just check if they exist
        return NextResponse.json({
          success: true,
          envCheck,
          message: 'Environment variables check completed'
        });
      } catch (error: unknown) {
        Sentry.captureException(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ 
          error: 'Failed to check environment variables', 
          details: errorMessage 
        }, { status: 500 });
      }
    }
  );
} 
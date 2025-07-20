import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/auth';
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import * as Sentry from "@sentry/nextjs";
import { z } from 'zod';

// Branded types for better type safety
type UserId = string & { readonly brand: unique symbol };
type StripeCustomerId = string & { readonly brand: unique symbol };
type YouTubeChannelId = string & { readonly brand: unique symbol };

// Zod schemas for runtime validation
const StripeSubscriptionSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  current_period_start: z.number().optional(),
  current_period_end: z.number().optional(),
  cancel_at_period_end: z.boolean().optional(),
  canceled_at: z.number().nullable().optional(),
  created: z.number().optional(),
  customer: z.string().optional(),
  items: z.object({
    data: z.array(z.object({
      id: z.string().optional(),
      price: z.object({
        id: z.string().optional(),
        product: z.string().optional(),
        unit_amount: z.number().optional(),
        currency: z.string().optional(),
      }).optional(),
      quantity: z.number().optional(),
    })).optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
});

const YouTubeChannelSchema = z.object({
  channel: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    customUrl: z.string().optional(),
    publishedAt: z.string().optional(),
    thumbnails: z.object({
      default: z.object({ url: z.string().optional(), width: z.number().optional(), height: z.number().optional() }).optional(),
      medium: z.object({ url: z.string().optional(), width: z.number().optional(), height: z.number().optional() }).optional(),
      high: z.object({ url: z.string().optional(), width: z.number().optional(), height: z.number().optional() }).optional(),
    }).optional(),
    statistics: z.object({
      viewCount: z.string().optional(),
      subscriberCount: z.string().optional(),
      hiddenSubscriberCount: z.boolean().optional(),
      videoCount: z.string().optional(),
    }).optional(),
  }).optional(),
  channelContext: z.object({
    channelData: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      subscriberCount: z.number().optional(),
      viewCount: z.number().optional(),
      videoCount: z.number().optional(),
      accountDate: z.string().optional(),
    }).optional(),
    aiIndicators: z.object({
      aiProbability: z.number().optional(),
      confidence: z.number().optional(),
    }).optional(),
  }).optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiry: z.number().optional(),
});

// Type definitions using Zod inferred types
type StripeSubscriptionData = z.infer<typeof StripeSubscriptionSchema>;
type YouTubeChannelData = z.infer<typeof YouTubeChannelSchema>;

// Type guards for runtime validation
function isValidStripeSubscription(data: unknown): data is StripeSubscriptionData {
  return StripeSubscriptionSchema.safeParse(data).success;
}

function isValidYouTubeChannel(data: unknown): data is YouTubeChannelData {
  return YouTubeChannelSchema.safeParse(data).success;
}

// Type definitions for user data export
interface UserProfileData extends DocumentData {
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  createdAt?: Timestamp | null;
  lastSignIn?: Timestamp | null;
  googleAccountId?: string | null;
  scanLimit?: number | null;
  scanCount?: number | null;
  subscriptionTier?: string | null;
  stripeCustomerId?: StripeCustomerId | null;
  subscriptionData?: StripeSubscriptionData | null;
  twoFactorEnabled?: boolean | null;
  twoFactorSetupAt?: Timestamp | null;
  twoFactorEnabledAt?: Timestamp | null;
  twoFactorSecret?: string | null;
  cpm?: number | null;
  rpm?: number | null;
  monetizedPercent?: number | null;
  includeCut?: boolean | null;
  revenueCalculatorSetup?: boolean | null;
  youtube?: YouTubeChannelData | null;
}

interface ScanData extends DocumentData {
  id: string;
  original_url?: string;
  url?: string;
  analysisResult?: {
    title?: string;
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
  };
  title?: string;
  riskLevel?: string;
  riskScore?: number;
  timestamp?: Timestamp;
  createdAt?: Timestamp;
  video_id?: string;
  userEmail?: string;
  userId?: UserId;
  isCache?: boolean;
}

interface ScanHistoryItem {
  id: string;
  url: string;
  title: string;
  riskLevel: string;
  riskScore: number;
  createdAt: string;
  status: string;
  videoId: string | null;
  userEmail: string | null;
}

interface UserExportData {
  userProfile: UserProfileData;
  scans: ScanData[];
  scanHistory: ScanHistoryItem[];
}

// Helper to fetch all user-related data with runtime validation
async function getUserData(userId: string): Promise<UserExportData> {
  // Define all compliance-relevant fields with null defaults
  const defaultProfile: UserProfileData = {
    email: null,
    displayName: null,
    photoURL: null,
    createdAt: null,
    lastSignIn: null,
    googleAccountId: null,
    scanLimit: null,
    scanCount: null,
    subscriptionTier: null,
    stripeCustomerId: null,
    subscriptionData: null,
    twoFactorEnabled: null,
    twoFactorSetupAt: null,
    twoFactorEnabledAt: null,
    twoFactorSecret: null,
    cpm: null,
    rpm: null,
    monetizedPercent: null,
    includeCut: null,
    revenueCalculatorSetup: null,
    youtube: null
  };

  // Fetch user profile
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const userData = userDoc.exists ? userDoc.data() : {};
  
  // Validate and sanitize external data
  let validatedSubscriptionData: StripeSubscriptionData | null = null;
  let validatedYouTubeData: YouTubeChannelData | null = null;

  if (userData.subscriptionData && isValidStripeSubscription(userData.subscriptionData)) {
    validatedSubscriptionData = userData.subscriptionData;
  }

  if (userData.youtube && isValidYouTubeChannel(userData.youtube)) {
    validatedYouTubeData = userData.youtube;
  }

  const userProfile: UserProfileData = {
    ...defaultProfile,
    ...userData,
    subscriptionData: validatedSubscriptionData,
    youtube: validatedYouTubeData,
  };

  // Fetch scans from the correct collection
  const scansSnap = await adminDb.collection('analysis_cache')
    .where('userId', '==', userId)
    .where('isCache', '==', false)
    .get();
  const scans = scansSnap.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as ScanData));

  // Remove scanHistory query for now (index issues)
  const scanHistory: ScanHistoryItem[] = [];

  // Add more collections as needed

  return {
    userProfile,
    scans,
    scanHistory,
  };
}

export async function GET(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: "http.server",
      name: "GET /api/export-user-data",
    },
    async () => {
      try {
        const session = await auth();
        const userId = session?.user?.id;
        if (!userId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limiting (simple: 1 export per hour, can be improved)
        // You can implement a more robust solution with Redis or Firestore
        // For now, just log the request
        await adminDb.collection('user_export_logs').add({
          userId,
          requestedAt: new Date(),
          ip: req.headers.get('x-forwarded-for') || null,
        });

        // Fetch all user data
        const userData = await getUserData(userId);

        // Return as downloadable JSON
        return new NextResponse(JSON.stringify(userData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="yellow-dollar-user-data-${userId}.json"`,
          },
        });
      } catch (error: unknown) {
        console.error('Export user data error:', error);
        Sentry.captureException(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        const errorStack = error instanceof Error ? error.stack : undefined;
        return NextResponse.json({ 
          error: 'Internal server error', 
          details: errorMessage, 
          stack: errorStack 
        }, { status: 500 });
      }
    }
  );
} 
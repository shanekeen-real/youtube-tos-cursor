import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { syncUserSubscription } from '@/lib/stripe/subscription-sync';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Manual sync requested for user:', userId);

    // Get user data from Firestore
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found in Firestore' }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer ID found' }, { status: 400 });
    }

    // Use centralized subscription sync utility
    const syncResult = await syncUserSubscription(userId, stripeCustomerId, stripe);

    if (!syncResult.success) {
      return NextResponse.json({ 
        error: 'Failed to sync subscription', 
        details: syncResult.error 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription synced successfully',
      data: {
        userId,
        newTier: syncResult.newTier,
        newScanLimit: syncResult.newScanLimit,
        renewalDate: syncResult.renewalDate,
        cancelledAt: syncResult.cancelledAt,
        expiresAt: syncResult.expiresAt,
        subscriptionsCount: syncResult.subscriptionsCount,
      }
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to sync subscription', details: errorMessage }, { status: 500 });
  }
} 
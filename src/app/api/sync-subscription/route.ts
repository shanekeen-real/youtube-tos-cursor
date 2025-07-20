import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';
import { FieldValue } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

// Extended types for Stripe objects with additional properties
type ExtendedSubscriptionItem = Stripe.SubscriptionItem & {
  current_period_end?: number;
};

type ExtendedSubscription = Stripe.Subscription & {
  items?: {
    data: ExtendedSubscriptionItem[];
  };
  cancel_at?: number;
  canceled_at?: number;
  current_period_end?: number;
};

interface SubscriptionData {
  tier: SubscriptionTier;
  limits: typeof SUBSCRIPTION_TIERS[SubscriptionTier]['limits'];
  updatedAt: string;
  cancelledAt?: string;
  expiresAt?: string;
  renewalDate?: string;
}

interface UpdatePayload {
  subscriptionTier: SubscriptionTier;
  scanLimit: number | 'unlimited' | 'custom';
  subscriptionData: SubscriptionData;
}

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

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10,
    });

    console.log('Found subscriptions:', subscriptions.data.length);

    let newTier: SubscriptionTier = 'free';
    let newScanLimit = SUBSCRIPTION_TIERS.free.limits.scanLimit;
    let renewalDate: string | undefined = undefined;
    let cancelledAt: string | undefined = undefined;
    let expiresAt: string | undefined = undefined;

    // Find the most recent active subscription
    const activeSubscription = subscriptions.data.find(sub => 
      sub.status === 'active' && !sub.cancel_at_period_end
    );

    if (activeSubscription) {
      console.log('Found active subscription:', activeSubscription.id);
      
      // Map Stripe price IDs to tiers
      const priceIdToTier: Record<string, SubscriptionTier> = {
        'price_1RhMBAPkKFhdAA8L8Zu8ljE1': 'pro', // Pro monthly
        'price_1RhMyCPkKFhdAA8Lw5rl0EDj': 'pro', // Pro annual
        'price_1RhMCEPkKFhdAA8Lzc1N3Uog': 'advanced', // Advanced monthly
        'price_1RhN86PkKFhdAA8LLoMj7vlc': 'advanced', // Advanced annual
      };

      if (activeSubscription.items && activeSubscription.items.data && activeSubscription.items.data.length > 0) {
        const firstItem = activeSubscription.items.data[0];
        const priceId = firstItem.price?.id;
        console.log('Subscription price ID:', priceId);

        if (priceId && priceIdToTier[priceId]) {
          newTier = priceIdToTier[priceId];
          newScanLimit = SUBSCRIPTION_TIERS[newTier].limits.scanLimit;
          console.log('Mapped to tier:', newTier);
        }
      }

      // Get current_period_end from the subscription item
      const activeSub = activeSubscription as ExtendedSubscription;
      if (activeSub.items && activeSub.items.data && activeSub.items.data.length > 0) {
        const firstItem = activeSub.items.data[0];
        if (firstItem.current_period_end) {
          renewalDate = new Date(firstItem.current_period_end * 1000).toISOString();
        }
      }
    } else {
      // Check for cancelled subscriptions
      const cancelledSubscription = subscriptions.data.find(sub => 
        sub.status === 'canceled' || sub.cancel_at_period_end
      );

      if (cancelledSubscription) {
        console.log('Found cancelled subscription:', cancelledSubscription.id);
        
        // Use proper typing for subscription properties
        const cancelledSub = cancelledSubscription as ExtendedSubscription;
        
        if (cancelledSub.canceled_at) {
          cancelledAt = new Date(cancelledSub.canceled_at * 1000).toISOString();
        }
        
        if (cancelledSub.cancel_at) {
          expiresAt = new Date(cancelledSub.cancel_at * 1000).toISOString();
        } else if (cancelledSub.items && cancelledSub.items.data && cancelledSub.items.data.length > 0) {
          const firstItem = cancelledSub.items.data[0];
          if (firstItem.current_period_end) {
            expiresAt = new Date(firstItem.current_period_end * 1000).toISOString();
          }
        }
      }
    }

    // Update Firestore with the correct data
    const updatePayload: UpdatePayload = {
      subscriptionTier: newTier,
      scanLimit: newScanLimit,
      subscriptionData: {
        tier: newTier,
        limits: SUBSCRIPTION_TIERS[newTier].limits,
        updatedAt: new Date().toISOString(),
        ...(renewalDate && { renewalDate }),
        ...(cancelledAt && { cancelledAt }),
        ...(expiresAt && { expiresAt }),
      }
    };

    console.log('Updating Firestore with payload:', updatePayload);
    await userRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      message: 'Subscription synced successfully',
      data: {
        userId,
        newTier,
        newScanLimit,
        renewalDate,
        cancelledAt,
        expiresAt,
        subscriptionsCount: subscriptions.data.length,
      }
    });
  } catch (error) {
    console.error('Manual sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to sync subscription', details: errorMessage }, { status: 500 });
  }
} 
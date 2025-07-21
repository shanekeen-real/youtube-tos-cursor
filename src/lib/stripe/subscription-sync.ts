import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';
import { getTierFromPriceId } from './price-mapping';

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
  stripeCustomerId?: string;
  subscriptionData: SubscriptionData;
}

interface SyncResult {
  success: boolean;
  newTier: SubscriptionTier;
  newScanLimit: number | 'unlimited' | 'custom';
  renewalDate?: string;
  cancelledAt?: string;
  expiresAt?: string;
  subscriptionsCount: number;
  error?: string;
}

/**
 * Centralized subscription synchronization utility
 * Handles all subscription state changes and updates user data in Firestore
 * 
 * @param userId - User ID to sync
 * @param stripeCustomerId - Stripe customer ID
 * @param stripe - Stripe instance
 * @returns SyncResult with updated subscription information
 */
export async function syncUserSubscription(
  userId: string,
  stripeCustomerId: string,
  stripe: Stripe
): Promise<SyncResult> {
  try {
    console.log('Starting subscription sync for user:', userId);
    
    // Get user data from Firestore
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return {
        success: false,
        newTier: 'free',
        newScanLimit: SUBSCRIPTION_TIERS.free.limits.scanLimit,
        subscriptionsCount: 0,
        error: 'User document not found'
      };
    }

    // Get all subscriptions for this customer to determine the correct state
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      limit: 10,
    });

    console.log('Found subscriptions for sync:', subscriptions.data.length);

    let newTier: SubscriptionTier = 'free';
    let newScanLimit = SUBSCRIPTION_TIERS.free.limits.scanLimit;
    let renewalDate: string | undefined = undefined;
    let cancelledAt: string | undefined = undefined;
    let expiresAt: string | undefined = undefined;

    // Find the most recent active subscription (including scheduled cancellations)
    const activeSubscription = subscriptions.data.find(sub => 
      sub.status === 'active'
    );

    if (activeSubscription) {
      console.log('Found active subscription:', activeSubscription.id);
      console.log('Subscription status:', activeSubscription.status);
      console.log('Cancel at period end:', activeSubscription.cancel_at_period_end);
      
      // Determine tier from the active subscription
      if (activeSubscription.items && activeSubscription.items.data && activeSubscription.items.data.length > 0) {
        const firstItem = activeSubscription.items.data[0];
        const priceId = firstItem.price?.id;
        console.log('Active subscription price ID:', priceId);
        
        if (priceId) {
          const mappedTier = getTierFromPriceId(priceId);
          if (mappedTier) {
            newTier = mappedTier;
            newScanLimit = SUBSCRIPTION_TIERS[mappedTier].limits.scanLimit;
            console.log('Mapped to tier:', newTier);
          }
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

      // Handle cancellation info if subscription is scheduled for cancellation
      if (activeSubscription.cancel_at_period_end) {
        const scheduledSub = activeSubscription as ExtendedSubscription;
        if (scheduledSub.cancel_at) {
          expiresAt = new Date(scheduledSub.cancel_at * 1000).toISOString();
        } else if (scheduledSub.items && scheduledSub.items.data && scheduledSub.items.data.length > 0) {
          const firstItem = scheduledSub.items.data[0];
          if (firstItem.current_period_end) {
            expiresAt = new Date(firstItem.current_period_end * 1000).toISOString();
          }
        }
        if (scheduledSub.canceled_at) {
          cancelledAt = new Date(scheduledSub.canceled_at * 1000).toISOString();
        } else {
          cancelledAt = new Date().toISOString();
        }
      }
    } else {
      // No active subscription found, check for cancelled subscriptions
      const cancelledSubscription = subscriptions.data.find(sub => 
        sub.status === 'canceled' || sub.status === 'incomplete_expired'
      );

      if (cancelledSubscription) {
        console.log('Found cancelled subscription:', cancelledSubscription.id);
        // User is fully cancelled, downgrade to free
        newTier = 'free';
        newScanLimit = SUBSCRIPTION_TIERS.free.limits.scanLimit;
        const cancelledSub = cancelledSubscription as ExtendedSubscription;
        if (cancelledSub.canceled_at) {
          cancelledAt = new Date(cancelledSub.canceled_at * 1000).toISOString();
        } else {
          cancelledAt = new Date().toISOString();
        }
        if (cancelledSub.cancel_at) {
          expiresAt = new Date(cancelledSub.cancel_at * 1000).toISOString();
        } else if (cancelledSub.items && cancelledSub.items.data && cancelledSub.items.data.length > 0) {
          const firstItem = cancelledSub.items.data[0];
          if (firstItem.current_period_end) {
            expiresAt = new Date(firstItem.current_period_end * 1000).toISOString();
          }
        }
        renewalDate = undefined;
      } else {
        console.log('No active or cancelled subscriptions found, defaulting to free tier');
        // No subscriptions found, default to free
        newTier = 'free';
        newScanLimit = SUBSCRIPTION_TIERS.free.limits.scanLimit;
      }
    }
    
    // Build subscriptionData dynamically to avoid undefined fields
    const subscriptionData: SubscriptionData = {
      tier: newTier,
      limits: SUBSCRIPTION_TIERS[newTier].limits,
      updatedAt: new Date().toISOString(),
      ...(cancelledAt && { cancelledAt }),
      ...(expiresAt && { expiresAt }),
      ...(renewalDate && { renewalDate }),
    };
    
    // Prepare updatePayload
    const updatePayload: UpdatePayload = {
      subscriptionTier: newTier,
      scanLimit: newScanLimit,
      stripeCustomerId,
      subscriptionData,
    };

    // Update Firestore with the correct data
    await userRef.update(updatePayload);
    console.log('Subscription sync complete for user:', userId);
    
    return {
      success: true,
      newTier,
      newScanLimit,
      renewalDate,
      cancelledAt,
      expiresAt,
      subscriptionsCount: subscriptions.data.length,
    };
    
  } catch (error) {
    console.error('Subscription sync error for user:', userId, error);
    return {
      success: false,
      newTier: 'free',
      newScanLimit: SUBSCRIPTION_TIERS.free.limits.scanLimit,
      subscriptionsCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Find user by Stripe customer ID
 * @param stripeCustomerId - Stripe customer ID to search for
 * @returns User ID if found, undefined otherwise
 */
export async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<string | undefined> {
  try {
    const usersRef = adminDb.collection('users');
    const query = usersRef.where('stripeCustomerId', '==', stripeCustomerId);
    const querySnapshot = await query.get();
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return userDoc.id;
    }
    
    return undefined;
  } catch (error) {
    console.error('Error searching for user by Stripe customer ID:', error);
    return undefined;
  }
} 
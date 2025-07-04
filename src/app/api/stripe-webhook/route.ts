import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';

// This is your Stripe CLI webhook secret for testing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    // Type assertion for metadata
    const objectWithMetadata = event.data.object as { metadata?: any };
    console.log('Received Stripe event:', event.type, objectWithMetadata.metadata);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      // Type assertion for metadata
      const sessionMetadata = (session as any).metadata || {};
      console.log('Session metadata:', sessionMetadata);
      console.log('Session subscription:', session.subscription);
      
      // Retrieve the userId and tier from metadata
      const userId = sessionMetadata.userId;
      const tier = sessionMetadata.tier as SubscriptionTier;

      if (!userId) {
        console.error("Webhook Error: No userId in checkout session metadata");
        return NextResponse.json({ error: 'Webhook Error: Missing userId' }, { status: 400 });
      }

      if (!tier || !SUBSCRIPTION_TIERS[tier]) {
        console.error("Webhook Error: Invalid tier in checkout session metadata");
        return NextResponse.json({ error: 'Webhook Error: Invalid tier' }, { status: 400 });
      }

      try {
        // Update user's profile in Firestore using the Admin SDK
        const userRef = adminDb.collection('users').doc(userId);
        const tierLimits = SUBSCRIPTION_TIERS[tier].limits;
        
        // Try to get renewal date from session.subscription if available
        let renewalDate: string | undefined = undefined;
        if (session.subscription) {
          const stripeSubResp = await stripe.subscriptions.retrieve(session.subscription as string);
          console.log('Stripe subscription object:', JSON.stringify(stripeSubResp, null, 2));
          const sub: any = stripeSubResp;
          if (sub.current_period_end) {
            renewalDate = new Date(sub.current_period_end * 1000).toISOString();
            console.log('Found current_period_end at top level:', sub.current_period_end);
          } else if (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].current_period_end) {
            renewalDate = new Date(sub.items.data[0].current_period_end * 1000).toISOString();
            console.log('Found current_period_end in items.data[0]:', sub.items.data[0].current_period_end);
          } else {
            console.log('No current_period_end found in subscription object.');
          }
          console.log('Computed renewalDate:', renewalDate);
        }
        const updatePayload = {
          subscriptionTier: tier,
          scanLimit: tierLimits.scanLimit,
          subscriptionData: {
            tier: tier,
            limits: tierLimits,
            updatedAt: new Date().toISOString(),
            ...(renewalDate ? { renewalDate } : {}),
          }
        };
        console.log('Firestore update payload:', JSON.stringify(updatePayload, null, 2));
        await userRef.update(updatePayload);
        console.log('Firestore update complete for user:', userId);
        
      } catch (dbError) {
        console.error('Firestore update error:', dbError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
      
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Handle subscription changes for recurring payments
      const subscription = event.data.object as any; // Stripe.Subscription but allow any for CLI/test
      const subscriptionUserId = subscription.metadata?.userId;
      
      if (subscriptionUserId) {
        try {
          const userRef = adminDb.collection('users').doc(subscriptionUserId);
          const userDoc = await userRef.get();
          // Fetch the current subscriptionData
          let prevData = {};
          if (userDoc && userDoc.exists) {
            const docData = userDoc.data();
            if (docData && docData.subscriptionData) {
              prevData = docData.subscriptionData;
            }
          }
          
          let renewalDate: string | undefined = undefined;
          if (subscription.current_period_end) {
            renewalDate = new Date(subscription.current_period_end * 1000).toISOString();
          }

          if (event.type === 'customer.subscription.deleted') {
            // Downgrade to free tier if subscription is cancelled
            const updatePayload = {
              subscriptionTier: 'free',
              scanLimit: 3,
              subscriptionData: {
                ...prevData,
                tier: 'free',
                limits: SUBSCRIPTION_TIERS.free.limits,
                updatedAt: new Date().toISOString(),
                cancelledAt: new Date().toISOString(),
              }
            };
            console.log('Firestore update payload (cancelled):', JSON.stringify(updatePayload, null, 2));
            await userRef.update(updatePayload);
            console.log(`User ${subscriptionUserId} subscription cancelled, downgraded to free.`);
          } else {
            // Update renewal date for active subscription
            console.log('Updating renewal date for user:', subscriptionUserId, 'renewalDate:', renewalDate);
            const updatePayload = {
              subscriptionData: {
                ...prevData,
                renewalDate,
                updatedAt: new Date().toISOString(),
              }
            };
            console.log('Firestore update payload (renewal):', JSON.stringify(updatePayload, null, 2));
            await userRef.update(updatePayload);
            console.log('Renewal date update complete for user:', subscriptionUserId);
          }
        } catch (dbError) {
          console.error(`Database Error for subscription update ${subscriptionUserId}:`, dbError);
        }
      }
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 
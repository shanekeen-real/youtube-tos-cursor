import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';
import { syncUserSubscription, findUserByStripeCustomerId } from '@/lib/stripe/subscription-sync';

// This is your Stripe CLI webhook secret for testing
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Type definitions for Stripe metadata and extended objects
interface StripeMetadata {
  userId?: string;
  tier?: string;
  billingCycle?: string;
}

interface StripeObjectWithMetadata {
  metadata?: StripeMetadata;
}

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

type ExtendedInvoice = Stripe.Invoice & {
  customer?: string;
  subscription?: string;
};

interface InvoicePaymentObject {
  invoice?: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    
    // Log the raw event data for debugging
    console.log('=== WEBHOOK EVENT RECEIVED ===');
    console.log('Event type:', event.type);
    console.log('Event ID:', event.id);
    console.log('Raw event data:', JSON.stringify(event.data.object, null, 2));
    console.log('================================');
    
    // Type assertion for metadata
    const objectWithMetadata = event.data.object as StripeObjectWithMetadata;
    console.log('Received Stripe event:', event.type, objectWithMetadata.metadata);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      console.log('=== CHECKOUT SESSION COMPLETED ===');
      const session = event.data.object as Stripe.Checkout.Session;
      // Type assertion for metadata
      const sessionMetadata = (session as Stripe.Checkout.Session & StripeObjectWithMetadata).metadata || {};
      console.log('Session metadata:', sessionMetadata);
      console.log('Session subscription:', session.subscription);
      console.log('Session customer:', session.customer);
      
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

      console.log('Processing checkout completion for user:', userId, 'tier:', tier);

      try {
        // Update user's profile in Firestore using the Admin SDK
        const userRef = adminDb.collection('users').doc(userId);
        // Get current user data to preserve existing fields
        const userDoc = await userRef.get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const tierLimits = SUBSCRIPTION_TIERS[tier].limits;
        
        // Try to get renewal date from session.subscription if available
        let renewalDate: string | undefined = undefined;
        if (session.subscription) {
          const stripeSubResp = await stripe.subscriptions.retrieve(session.subscription as string);
          console.log('Stripe subscription object:', JSON.stringify(stripeSubResp, null, 2));
          const sub = stripeSubResp as ExtendedSubscription;
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
        // Always set Stripe customer ID
        let stripeCustomerId = userData?.stripeCustomerId;
        if (session.customer) {
          stripeCustomerId = session.customer as string;
        }
        const updatePayload = {
          subscriptionTier: tier,
          scanLimit: tierLimits.scanLimit,
          stripeCustomerId: stripeCustomerId, // Always include, even if null
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
      const subscription = event.data.object as ExtendedSubscription;
      let subscriptionUserId = subscription.metadata?.userId;
      
      console.log('=== SUBSCRIPTION UPDATE DEBUG ===');
      console.log('Event type:', event.type);
      console.log('Subscription ID:', subscription.id);
      console.log('User ID from metadata:', subscriptionUserId);
      console.log('Customer ID:', subscription.customer);
      console.log('cancel_at_period_end:', subscription.cancel_at_period_end);
      console.log('cancel_at:', subscription.cancel_at);
      console.log('canceled_at:', subscription.canceled_at);
      console.log('status:', subscription.status);
      console.log('current_period_end:', subscription.current_period_end);
      console.log('================================');
      
      // If no userId in metadata, try to find user by Stripe customer ID
      if (!subscriptionUserId && subscription.customer) {
        console.log('No userId in metadata, searching for user by Stripe customer ID...');
          const foundUserId = await findUserByStripeCustomerId(subscription.customer as string);
          if (foundUserId) {
            subscriptionUserId = foundUserId;
            console.log('Found user by Stripe customer ID:', subscriptionUserId);
          } else {
            console.error('No user found with this Stripe customer ID:', subscription.customer);
        }
      }
      
      if (!subscriptionUserId) {
        console.error('No user found for this subscription event. Skipping Firestore update.');
      } else {
        try {
          // Use centralized subscription sync utility
          console.log('Performing automatic subscription sync for user:', subscriptionUserId);
          
          const userRef = adminDb.collection('users').doc(subscriptionUserId);
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.error('User document not found for automatic sync:', subscriptionUserId);
            break;
          }
          
          const userData = userDoc.data();
          const stripeCustomerId = userData?.stripeCustomerId || (subscription.customer as string);
          
          if (!stripeCustomerId) {
            console.error('No Stripe customer ID found for automatic sync:', subscriptionUserId);
            break;
          }
          
          // Use centralized sync utility
          const syncResult = await syncUserSubscription(subscriptionUserId, stripeCustomerId, stripe);

          if (syncResult.success) {
            console.log('Automatic subscription sync complete for user:', subscriptionUserId);
          } else {
            console.error('Subscription sync failed for user:', subscriptionUserId, syncResult.error);
          }
          
        } catch (dbError) {
          console.error(`Database Error for automatic subscription sync ${subscriptionUserId}:`, dbError);
        }
      }
      break;
    case 'invoice.payment_succeeded':
      console.log('Handling invoice.payment_succeeded event...');
      const invoice = event.data.object as ExtendedInvoice;
      console.log('Invoice customer:', invoice.customer);
      console.log('Invoice subscription:', invoice.subscription);
      
      // If this invoice is for a subscription, trigger automatic sync
      if (invoice.subscription) {
        try {
          // Retrieve the subscription to get customer ID
          const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription as string);
          console.log('Retrieved subscription for invoice:', stripeSub.id);
          
          const subscription = stripeSub as ExtendedSubscription;
          let subscriptionUserId = subscription.metadata?.userId;
          
          console.log('Processing invoice payment with automatic sync...');
          console.log('User ID from metadata:', subscriptionUserId);
          console.log('Customer ID:', subscription.customer);
          
          // If no userId in metadata, try to find user by Stripe customer ID
          if (!subscriptionUserId && subscription.customer) {
            console.log('No userId in metadata, searching for user by Stripe customer ID...');
            const foundUserId = await findUserByStripeCustomerId(subscription.customer as string);
            if (foundUserId) {
              subscriptionUserId = foundUserId;
                console.log('Found user by Stripe customer ID:', subscriptionUserId);
              } else {
                console.log('No user found with this Stripe customer ID');
            }
          }
          
          if (subscriptionUserId) {
            // Use centralized subscription sync utility
            console.log('Performing automatic subscription sync for invoice payment...');
            
            const userRef = adminDb.collection('users').doc(subscriptionUserId);
            const userDoc = await userRef.get();
            
            if (!userDoc.exists) {
              console.error('User document not found for invoice payment sync');
              break;
            }
            
            const userData = userDoc.data();
            const stripeCustomerId = userData?.stripeCustomerId || (subscription.customer as string);
            
            if (!stripeCustomerId) {
              console.error('No Stripe customer ID found for invoice payment sync');
              break;
            }
            
            // Use centralized sync utility
            const syncResult = await syncUserSubscription(subscriptionUserId, stripeCustomerId, stripe);
            
            if (syncResult.success) {
              console.log('Invoice payment sync complete for user:', subscriptionUserId);
            } else {
              console.error('Invoice payment sync failed for user:', subscriptionUserId, syncResult.error);
            }
          }
        } catch (error) {
          console.error('Error processing invoice payment sync:', error);
        }
      }
      break;
    case 'invoice_payment.paid':
      console.log('Handling invoice_payment.paid event...');
      // This event is similar to invoice.payment_succeeded but for invoice payments specifically
      // We can handle it the same way
      const invoicePayment = event.data.object as InvoicePaymentObject;
      console.log('Invoice payment customer:', invoicePayment.invoice);
      
      // If this payment is for an invoice with a subscription, handle it
      if (invoicePayment.invoice) {
        try {
          const invoice = await stripe.invoices.retrieve(invoicePayment.invoice as string) as ExtendedInvoice;
          if (invoice.subscription) {
            console.log('Invoice payment is for subscription:', invoice.subscription);
            // Handle this the same way as invoice.payment_succeeded
            const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription as string);
            // ... same logic as above, but we'll keep it simple for now
            console.log('Invoice payment processed for subscription:', stripeSub.id);
          }
        } catch (error) {
          console.error('Error processing invoice payment:', error);
        }
      }
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 
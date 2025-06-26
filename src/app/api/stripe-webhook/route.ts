import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

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
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Retrieve the userId from metadata
      const userId = session.metadata?.userId;

      if (!userId) {
        console.error("Webhook Error: No userId in checkout session metadata");
        return NextResponse.json({ error: 'Webhook Error: Missing userId' }, { status: 400 });
      }

      try {
        // Update user's profile in Firestore using the Admin SDK
        const userRef = adminDb.collection('users').doc(userId);
        
        await userRef.update({
            subscriptionTier: 'pro',
            scanLimit: 99999, // Represents "unlimited"
        });

        console.log(`Successfully upgraded user ${userId} to Pro.`);
        
      } catch (dbError) {
        console.error(`Database Error for user ${userId}:`, dbError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
      
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
} 
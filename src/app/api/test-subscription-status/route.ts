import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    console.log('Testing subscription status for user:', userId);

    // Get user data from Firestore
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found in Firestore' }, { status: 404 });
    }

    const userData = userDoc.data();
    console.log('Firestore user data:', userData);

    // Get Stripe customer data if available
    let stripeData = null;
    if (userData?.stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(userData.stripeCustomerId);
        console.log('Stripe customer data:', customer);

        // Get active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripeCustomerId,
          status: 'all',
        });
        console.log('Stripe subscriptions:', subscriptions);

        stripeData = {
          customer,
          subscriptions: subscriptions.data,
        };
      } catch (error) {
        console.error('Error fetching Stripe data:', error);
        stripeData = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      userId,
      firestore: userData,
      stripe: stripeData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test subscription status error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to test subscription status', details: errorMessage }, { status: 500 });
  }
} 
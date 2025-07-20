import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

// Extended type for Stripe subscription with additional properties
type ExtendedSubscription = Stripe.Subscription & {
  current_period_end?: number;
};

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
    console.log('Fixing Stripe customer ID for user:', userId);

    // Get user data from Firestore
    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found in Firestore' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    if (!userData) {
      return NextResponse.json({ error: 'User data is undefined' }, { status: 500 });
    }
    
    // If user already has stripeCustomerId, no need to fix
    if (userData.stripeCustomerId) {
      return NextResponse.json({ 
        message: 'User already has Stripe customer ID',
        stripeCustomerId: userData.stripeCustomerId
      });
    }

    // If user doesn't have a paid subscription, no need to fix
    if (userData.subscriptionTier === 'free') {
      return NextResponse.json({ 
        message: 'User is on free tier, no Stripe customer ID needed'
      });
    }

    // Search for the user's subscription in Stripe by email
    console.log('Searching for customer by email:', userData.email);
    
    try {
      const customers = await stripe.customers.list({
        email: userData.email,
        limit: 10,
      });

      console.log('Found customers with this email:', customers.data.length);

      if (customers.data.length === 0) {
        return NextResponse.json({ 
          error: 'No Stripe customer found with this email',
          details: 'The user may not have completed the checkout process properly.'
        }, { status: 404 });
      }

      // Get the most recent customer (usually the one with the active subscription)
      const customer = customers.data[0];
      console.log('Found customer:', customer.id);

      // Verify this customer has an active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 10,
      });

      console.log('Found subscriptions for customer:', subscriptions.data.length);

      const hasActiveSubscription = subscriptions.data.some(sub => 
        sub.status === 'active'
      );

      if (!hasActiveSubscription) {
        return NextResponse.json({ 
          error: 'No active subscription found for this customer',
          details: 'The customer exists but has no active subscription.'
        }, { status: 404 });
      }

      // Update the user's Firestore document with the Stripe customer ID
      await userRef.update({
        stripeCustomerId: customer.id,
        updatedAt: new Date()
      });

      console.log('Successfully updated user with Stripe customer ID:', customer.id);

      return NextResponse.json({
        success: true,
        message: 'Stripe customer ID fixed successfully',
        stripeCustomerId: customer.id,
        customer: {
          id: customer.id,
          email: customer.email,
          subscriptions: subscriptions.data.map(sub => ({
            id: sub.id,
            status: sub.status,
            current_period_end: (sub as ExtendedSubscription).current_period_end
          }))
        }
      });

    } catch (stripeError) {
      console.error('Error searching Stripe:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to search Stripe',
        details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Fix Stripe customer ID error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix Stripe customer ID',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
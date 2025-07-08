import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: NextRequest) {
  try {
    console.log('=== CUSTOMER PORTAL SESSION REQUEST ===');
    
    // Verify Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json({ 
        error: 'Stripe configuration error',
        details: 'Stripe is not properly configured. Please contact support.'
      }, { status: 500 });
    }
    
    const session = await auth();
    console.log('Auth session user ID:', session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('No authenticated user found');
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Get user's Stripe customer ID from Firestore
    const userRef = adminDb.collection('users').doc(session.user.id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('User document not found in Firestore');
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId;
    console.log('Stripe customer ID from Firestore:', stripeCustomerId);
    console.log('User subscription tier:', userData?.subscriptionTier);

    if (!stripeCustomerId) {
      console.log('No Stripe customer ID found');
      return NextResponse.json({ 
        error: 'No Stripe customer ID found',
        details: 'You need to have an active subscription to access the customer portal. Please upgrade your plan first.'
      }, { status: 400 });
    }

    // Verify that the customer has an active subscription in Stripe
    try {
      console.log('Checking Stripe subscriptions for customer:', stripeCustomerId);
      
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 10,
      });

      console.log('Found subscriptions for customer portal check:', subscriptions.data.length);
      console.log('Subscription details:', subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: (sub as any).current_period_end
      })));

      // Check if there's any active subscription (including scheduled cancellations)
      // Subscriptions with status 'active' are valid for customer portal access
      // This includes both regular active subscriptions and those scheduled for cancellation
      const hasActiveSubscription = subscriptions.data.some(sub => 
        sub.status === 'active'
      );

      console.log('Has active subscription:', hasActiveSubscription);

      if (!hasActiveSubscription) {
        console.log('No active subscription found in Stripe');
        return NextResponse.json({ 
          error: 'No active subscription found',
          details: 'Your subscription may have expired or been cancelled. Please check your subscription status or upgrade your plan.'
        }, { status: 400 });
      }

    } catch (stripeError) {
      console.error('Error checking Stripe subscriptions:', stripeError);
      return NextResponse.json({ 
        error: 'Failed to verify subscription status',
        details: 'Unable to check your subscription status. Please try again or contact support.'
      }, { status: 500 });
    }

    // Create a Customer Portal session
    console.log('Creating customer portal session for customer:', stripeCustomerId);
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`,
      });

      console.log('Portal session created successfully:', portalSession.url);
      return NextResponse.json({ url: portalSession.url });
    } catch (portalError) {
      console.error('Error creating portal session:', portalError);
      
      // Handle specific Stripe errors
      if (portalError instanceof Error) {
        if (portalError.message.includes('customer')) {
          return NextResponse.json({ 
            error: 'Invalid customer',
            details: 'The customer ID is invalid or the customer does not exist in Stripe.'
          }, { status: 400 });
        } else if (portalError.message.includes('billing_portal')) {
          return NextResponse.json({ 
            error: 'Customer portal not configured',
            details: 'The customer portal is not properly configured in Stripe. Please contact support.'
          }, { status: 500 });
        } else {
          return NextResponse.json({ 
            error: 'Portal creation failed',
            details: portalError.message
          }, { status: 500 });
        }
      }
      
      return NextResponse.json({ 
        error: 'Portal creation failed',
        details: 'An unknown error occurred while creating the customer portal session.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Customer portal session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to create customer portal session', 
      details: errorMessage 
    }, { status: 500 });
  }
} 
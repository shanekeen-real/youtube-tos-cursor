import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export async function GET(req: NextRequest) {
  try {
    console.log('=== TESTING SUBSCRIPTION STATUS ===');
    
    // Verify Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return NextResponse.json({ 
        error: 'Stripe configuration error',
        details: 'Stripe is not properly configured.'
      }, { status: 500 });
    }
    
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
    let portalTest = null;
    
    if (userData?.stripeCustomerId) {
      try {
        console.log('Testing Stripe connection with customer ID:', userData.stripeCustomerId);
        
        const customer = await stripe.customers.retrieve(userData.stripeCustomerId);
        console.log('Stripe customer data:', customer);

        // Get active subscriptions for this customer
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripeCustomerId,
          status: 'all',
        });
        console.log('Stripe subscriptions:', subscriptions);

        // Test customer portal creation
        try {
          console.log('Testing customer portal creation...');
          const portalSession = await stripe.billingPortal.sessions.create({
            customer: userData.stripeCustomerId,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`,
          });
          portalTest = {
            success: true,
            url: portalSession.url,
            sessionId: portalSession.id
          };
          console.log('Portal test successful:', portalTest);
        } catch (portalError) {
          console.error('Portal test failed:', portalError);
          portalTest = {
            success: false,
            error: portalError instanceof Error ? portalError.message : 'Unknown portal error',
            fullError: portalError
          };
        }

        stripeData = {
          customer,
          subscriptions: subscriptions.data,
          portalTest
        };
      } catch (error) {
        console.error('Error fetching Stripe data:', error);
        stripeData = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    const result = {
      userId,
      firestore: userData,
      stripe: stripeData,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Test result:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test subscription status error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 
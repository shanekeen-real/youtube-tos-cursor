import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { tier } = await req.json();
    
    if (!tier || !SUBSCRIPTION_TIERS[tier as SubscriptionTier]) {
      return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
    }

    const selectedTier = SUBSCRIPTION_TIERS[tier as SubscriptionTier];
    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create a Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `TOS Analyzer - ${selectedTier.name} ${selectedTier.billingCycle === 'monthly' ? 'Subscription' : 'Plan'}`,
              description: selectedTier.description,
            },
            unit_amount: Number(selectedTier.price) * 100, // Convert to cents
            ...(selectedTier.billingCycle === 'monthly' && {
              recurring: {
                interval: 'month',
              },
            }),
          },
          quantity: 1,
        },
      ],
      mode: selectedTier.billingCycle === 'monthly' ? 'subscription' : 'payment',
      success_url: `${YOUR_DOMAIN}/dashboard?payment_success=true&tier=${tier}`,
      cancel_url: `${YOUR_DOMAIN}/dashboard?payment_canceled=true`,
      metadata: {
        userId: session.user.id,
        tier: tier,
      },
    });

    if (!checkoutSession.id) {
        throw new Error("Could not create Stripe session");
    }

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Stripe checkout failed', details: errorMessage }, { status: 500 });
  }
} 
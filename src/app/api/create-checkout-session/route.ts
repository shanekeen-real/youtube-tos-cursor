import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10', // Use a fixed API version
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const YOUR_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create a Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          // This is a placeholder price ID. We will create a real one in the Stripe dashboard.
          // For now, let's assume a one-time payment for "Pro" access.
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'TOS Analyzer - Pro Subscription',
              description: 'Unlimited scans and access to all pro features.',
            },
            unit_amount: 500, // $5.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Use 'subscription' for recurring payments
      success_url: `${YOUR_DOMAIN}/dashboard?payment_success=true`,
      cancel_url: `${YOUR_DOMAIN}/dashboard?payment_canceled=true`,
      metadata: {
        // Pass the user's ID so we can identify them in the webhook
        userId: userId,
      },
    });

    if (!session.id) {
        throw new Error("Could not create Stripe session");
    }

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Stripe checkout failed', details: errorMessage }, { status: 500 });
  }
} 
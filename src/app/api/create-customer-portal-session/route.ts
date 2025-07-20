import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { z } from 'zod';

// Branded types for better type safety
type StripeCustomerId = string & { readonly brand: unique symbol };
type StripeSecretKey = string & { readonly brand: unique symbol };
type UserId = string & { readonly brand: unique symbol };

// Zod schemas for Stripe API responses
const StripeSubscriptionSchema = z.object({
  id: z.string(),
  status: z.enum(['active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid']),
  cancel_at_period_end: z.boolean(),
  current_period_end: z.number(),
  customer: z.string(),
  created: z.number(),
  metadata: z.record(z.string()).optional(),
});

const StripeSubscriptionListSchema = z.object({
  data: z.array(StripeSubscriptionSchema),
  has_more: z.boolean(),
  total_count: z.number().optional(),
  url: z.string(),
});

const StripePortalSessionSchema = z.object({
  id: z.string(),
  url: z.string(),
  created: z.number(),
  customer: z.string(),
  return_url: z.string().optional(),
});

const StripeErrorSchema = z.object({
  type: z.string().optional(),
  code: z.string().optional(),
  message: z.string(),
  param: z.string().optional(),
  decline_code: z.string().optional(),
});

// Type definitions using Zod inferred types
type StripeSubscription = z.infer<typeof StripeSubscriptionSchema>;
type StripeSubscriptionList = z.infer<typeof StripeSubscriptionListSchema>;
type StripePortalSession = z.infer<typeof StripePortalSessionSchema>;
type StripeError = z.infer<typeof StripeErrorSchema>;

// Type guards for runtime validation
function isValidStripeSubscription(subscription: unknown): subscription is StripeSubscription {
  return StripeSubscriptionSchema.safeParse(subscription).success;
}

function isValidStripeSubscriptionList(subscriptionList: unknown): subscriptionList is StripeSubscriptionList {
  return StripeSubscriptionListSchema.safeParse(subscriptionList).success;
}

function isValidStripePortalSession(portalSession: unknown): portalSession is StripePortalSession {
  return StripePortalSessionSchema.safeParse(portalSession).success;
}

function isValidStripeError(error: unknown): error is StripeError {
  return StripeErrorSchema.safeParse(error).success;
}

// User data interface
interface UserData {
  stripeCustomerId?: string;
  subscriptionTier?: string;
  email?: string;
  displayName?: string;
}

// Response interfaces
interface CustomerPortalSuccessResponse {
  url: string;
}

interface CustomerPortalErrorResponse {
  error: string;
  details: string;
}

type CustomerPortalResponse = CustomerPortalSuccessResponse | CustomerPortalErrorResponse;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: NextRequest): Promise<NextResponse<CustomerPortalResponse>> {
  try {
    console.log('=== CUSTOMER PORTAL SESSION REQUEST ===');
    
    // Verify Stripe configuration
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      const errorResponse: CustomerPortalErrorResponse = {
        error: 'Stripe configuration error',
        details: 'Stripe is not properly configured. Please contact support.'
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
    
    const session = await auth();
    console.log('Auth session user ID:', session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('No authenticated user found');
      const errorResponse: CustomerPortalErrorResponse = {
        error: 'User not authenticated',
        details: 'Please log in to access the customer portal.'
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Get user's Stripe customer ID from Firestore
    const userRef = adminDb.collection('users').doc(session.user.id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('User document not found in Firestore');
      const errorResponse: CustomerPortalErrorResponse = {
        error: 'User profile not found',
        details: 'Your user profile could not be found. Please contact support.'
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    const userData = userDoc.data() as UserData;
    const stripeCustomerId = userData?.stripeCustomerId;
    console.log('Stripe customer ID from Firestore:', stripeCustomerId);
    console.log('User subscription tier:', userData?.subscriptionTier);

    if (!stripeCustomerId) {
      console.log('No Stripe customer ID found');
      const errorResponse: CustomerPortalErrorResponse = {
        error: 'No Stripe customer ID found',
        details: 'You need to have an active subscription to access the customer portal. Please upgrade your plan first.'
      };
      return NextResponse.json(errorResponse, { status: 400 });
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
        cancel_at_period_end: sub.cancel_at_period_end
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
        const errorResponse: CustomerPortalErrorResponse = {
          error: 'No active subscription found',
          details: 'Your subscription may have expired or been cancelled. Please check your subscription status or upgrade your plan.'
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }

    } catch (stripeError) {
      console.error('Error checking Stripe subscriptions:', stripeError);
      const errorResponse: CustomerPortalErrorResponse = {
        error: 'Failed to verify subscription status',
        details: 'Unable to check your subscription status. Please try again or contact support.'
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Create a Customer Portal session
    console.log('Creating customer portal session for customer:', stripeCustomerId);
    
    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings`,
      });

      // Validate portal session response
      if (isValidStripePortalSession(portalSession)) {
        console.log('Portal session created successfully:', portalSession.url);
        const successResponse: CustomerPortalSuccessResponse = { url: portalSession.url };
        return NextResponse.json(successResponse);
      } else {
        console.warn('Invalid portal session structure:', portalSession);
        const errorResponse: CustomerPortalErrorResponse = {
          error: 'Invalid portal session',
          details: 'The portal session response was invalid. Please try again or contact support.'
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
    } catch (portalError) {
      console.error('Error creating portal session:', portalError);
      
      // Handle specific Stripe errors
      if (portalError instanceof Error) {
        if (portalError.message.includes('customer')) {
          const errorResponse: CustomerPortalErrorResponse = {
            error: 'Invalid customer',
            details: 'The customer ID is invalid or the customer does not exist in Stripe.'
          };
          return NextResponse.json(errorResponse, { status: 400 });
        } else if (portalError.message.includes('billing_portal')) {
          const errorResponse: CustomerPortalErrorResponse = {
            error: 'Customer portal not configured',
            details: 'The customer portal is not properly configured in Stripe. Please contact support.'
          };
          return NextResponse.json(errorResponse, { status: 500 });
        } else {
          const errorResponse: CustomerPortalErrorResponse = {
            error: 'Portal creation failed',
            details: portalError.message
          };
          return NextResponse.json(errorResponse, { status: 500 });
        }
      }
      
      const errorResponse: CustomerPortalErrorResponse = {
        error: 'Portal creation failed',
        details: 'An unknown error occurred while creating the customer portal session.'
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Customer portal session error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorResponse: CustomerPortalErrorResponse = {
      error: 'Failed to create customer portal session', 
      details: errorMessage 
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 
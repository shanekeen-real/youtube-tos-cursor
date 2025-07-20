"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { UserProfile } from '@/components/dashboard/types';
import { PERFORMANCE_CONFIG } from '@/lib/constants/policy-terms';

// Load the Stripe.js library with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function useDashboardData() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canBatchScan, setCanBatchScan] = useState(false);
  
  // Performance optimization: Prevent multiple simultaneous API calls
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);

  // Move fetchUserProfile out of useEffect so it can be reused
  const fetchUserProfile = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    
    // Performance optimization: Prevent multiple simultaneous API calls
    const now = Date.now();
    if (fetchingRef.current || (now - lastFetchRef.current < PERFORMANCE_CONFIG.API_CALL_THROTTLE)) {
      return; // Already fetching or fetched recently
    }
    
    fetchingRef.current = true;
    lastFetchRef.current = now;
    
    try {
      const response = await fetch('/api/get-user-profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.userProfile as UserProfile);
        setCanBatchScan(data.userProfile.subscriptionTier === 'advanced' || data.userProfile.subscriptionTier === 'enterprise');
      } else {
        setError('Your account data is missing. Please contact support.');
        setUserProfile(null);
        setCanBatchScan(false);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard data.';
      setError(errorMessage);
      setLoading(false);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Wait for both session and authentication to be ready before fetching user profile
  useEffect(() => {
    let retryCount = 0;
    const waitForSession = async () => {
      if (status !== 'authenticated' || !session?.user?.id) {
        if (retryCount < PERFORMANCE_CONFIG.MAX_SESSION_RETRIES) {
          retryCount++;
          setTimeout(waitForSession, PERFORMANCE_CONFIG.SESSION_RETRY_DELAY);
        }
        return;
      }
      fetchUserProfile();
    };
    waitForSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  // After subscription upgrade, refetch user profile
  const handleUpgradeClick = async () => {
    if (!session?.user?.id) {
        alert("Please sign in to upgrade.");
        return;
    }
    try {
        const { data } = await axios.post('/api/create-checkout-session', {
            userId: session.user.id
        });
        const stripe = await stripePromise;
        if (stripe) {
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
            await fetchUserProfile(); // Refetch after upgrade
        }
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        alert("Failed to start the upgrade process. Please try again.");
    }
  };

  return {
    session,
    status,
    userProfile,
    loading,
    error,
    canBatchScan,
    fetchUserProfile,
    handleUpgradeClick
  };
} 
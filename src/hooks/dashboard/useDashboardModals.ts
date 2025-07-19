"use client";

import { useState } from 'react';
import { Session } from 'next-auth';
import { SelectedVideoForReports } from '@/components/dashboard/types';

export function useDashboardModals(session: Session | null, fetchUserProfile: () => Promise<void>) {
  const [showCelebration, setShowCelebration] = useState(false);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedVideoForReports, setSelectedVideoForReports] = useState<SelectedVideoForReports | null>(null);

  // Handle viewing reports for a video
  const handleViewReports = (videoId: string, videoTitle: string) => {
    setSelectedVideoForReports({ id: videoId, title: videoTitle });
    setReportsModalOpen(true);
  };

  const handleCloseReportsModal = () => {
    setReportsModalOpen(false);
    setSelectedVideoForReports(null);
  };

  // After subscription upgrade, refetch user profile
  const handleUpgradeClick = async () => {
    if (!session?.user?.id) {
        alert("Please sign in to upgrade.");
        return;
    }
    try {
        const { data } = await fetch('/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
        }).then(res => res.json());
        
        // Redirect to Stripe checkout
        const stripe = await import('@stripe/stripe-js').then(stripe => 
          stripe.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        );
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
    showCelebration,
    setShowCelebration,
    reportsModalOpen,
    selectedVideoForReports,
    handleUpgradeClick,
    handleViewReports,
    handleCloseReportsModal
  };
} 
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { checkUserCanExport, checkUserCanAccessAIDetection } from '@/lib/subscription-utils';
import { getTierLimits } from '@/types/subscription';

export function useResultsPermissions() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [canExport, setCanExport] = useState(false);
  const [canAccessAIDetection, setCanAccessAIDetection] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch('/api/get-user-profile');
        if (response.ok) {
          const data = await response.json();
          const profile = data.userProfile;
          setUserProfile(profile);
          const exportCheck = checkUserCanExport(profile);
          setCanExport(exportCheck.canExport);
          const aiDetectionCheck = checkUserCanAccessAIDetection(profile);
          setCanAccessAIDetection(aiDetectionCheck.canAccess);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchUserProfile();
  }, [session?.user?.id]);

  const getSuggestionLimit = (data: any) => {
    // If userProfile is still loading, return a high limit to show all suggestions temporarily
    if (!userProfile && status === 'authenticated') {
      console.log('[ResultsPage] User profile still loading, showing all suggestions temporarily');
      return 100;
    }
    
    const tier = userProfile?.subscriptionTier || 'free';
    const limits = getTierLimits(tier);
    const limit = limits.suggestionsPerScan === 'all' ? 100 : limits.suggestionsPerScan;
    
    // Debug logging
    console.log('[ResultsPage] User profile:', userProfile);
    console.log('[ResultsPage] Subscription tier:', tier);
    console.log('[ResultsPage] Tier limits:', limits);
    console.log('[ResultsPage] Suggestion limit:', limit);
    console.log('[ResultsPage] Total suggestions available:', data?.suggestions?.length || 0);
    
    return limit;
  };

  return {
    userProfile,
    canExport,
    canAccessAIDetection,
    getSuggestionLimit,
    status
  };
} 
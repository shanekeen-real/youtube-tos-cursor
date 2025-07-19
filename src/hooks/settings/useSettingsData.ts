import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Define the structure of a user's profile data
interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
  stripeCustomerId?: string;
  subscriptionData?: {
    renewalDate?: string;
    cancelledAt?: string;
    expiresAt?: string;
  };
  twoFactorEnabled?: boolean;
  twoFactorSetupAt?: string;
  twoFactorEnabledAt?: string;
}

export function useSettingsData() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Move fetchUserProfile out of useEffect so it can be reused
  const fetchUserProfile = async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/get-user-profile');
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.userProfile as UserProfile);
        setError(null);
      } else {
        setError('Your account data is missing. Please contact support.');
        setUserProfile(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user profile.');
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Wait for both session and authentication to be ready before fetching user profile
  useEffect(() => {
    let retryCount = 0;
    const waitForSession = async () => {
      if (status !== 'authenticated' || !session?.user?.id) {
        if (retryCount < 20) {
          retryCount++;
          setTimeout(waitForSession, 200);
        } else {
          setLoading(false);
        }
        return;
      }
      fetchUserProfile();
    };
    waitForSession();
  }, [status, session]);

  // Calculate usage progress
  const progress = userProfile ? (userProfile.scanCount / userProfile.scanLimit) * 100 : 0;

  return {
    session,
    status,
    userProfile,
    loading,
    error,
    progress,
    fetchUserProfile
  };
} 
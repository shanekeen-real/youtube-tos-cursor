import React from 'react';
import { Shield } from 'lucide-react';
import Card from '../Card';
import { getTierLimits } from '@/types/subscription';

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

interface UsageCardProps {
  userProfile: UserProfile | null;
  progress: number;
}

export default function UsageCard({ userProfile, progress }: UsageCardProps) {
  if (!userProfile) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-yellow-500" />
          <h2 className="text-subtitle font-semibold text-gray-800">Usage</h2>
        </div>
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
          </div>
        </div>
      </Card>
    );
  }

  const tierLimits = getTierLimits(userProfile.subscriptionTier);
  const displayLimit = tierLimits.scanLimit === 'unlimited' ? 'unlimited' : tierLimits.scanLimit;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Shield className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">Usage</h2>
      </div>
      <div className="space-y-4">
        <p className="text-gray-600">
          You have used <span className="font-semibold text-gray-800">{userProfile.scanCount}</span> of your <span className="font-semibold text-gray-800">{displayLimit}</span> scans this month.
        </p>
        <div className="space-y-2">
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-right text-caption text-gray-500">{Math.round(progress)}% used</div>
        </div>
      </div>
    </Card>
  );
} 
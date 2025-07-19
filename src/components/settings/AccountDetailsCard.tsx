import React from 'react';
import { User } from 'lucide-react';
import Card from '../Card';

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

interface AccountDetailsCardProps {
  userProfile: UserProfile | null;
}

export default function AccountDetailsCard({ userProfile }: AccountDetailsCardProps) {
  if (!userProfile) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-yellow-500" />
          <h2 className="text-subtitle font-semibold text-gray-800">Account Details</h2>
        </div>
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <User className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">Account Details</h2>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Email</span>
          <span className="font-medium text-gray-800">{userProfile.email}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Member Since</span>
          <span className="font-medium text-gray-800">{new Date(userProfile.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600">Subscription Tier</span>
          <span className="font-medium text-gray-800 capitalize">{userProfile.subscriptionTier}</span>
        </div>
      </div>
    </Card>
  );
} 
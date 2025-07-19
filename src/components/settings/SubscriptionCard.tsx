import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card } from '@/lib/imports';
import { Button } from '@/lib/imports';

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

interface SubscriptionCardProps {
  userProfile: UserProfile | null;
  managingSubscription: boolean;
  subscriptionError: string | null;
  onManageSubscription: () => void;
  onClearSubscriptionError: () => void;
}

export default function SubscriptionCard({ 
  userProfile, 
  managingSubscription, 
  subscriptionError, 
  onManageSubscription, 
  onClearSubscriptionError 
}: SubscriptionCardProps) {
  if (!userProfile) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-yellow-500" />
          <h2 className="text-subtitle font-semibold text-gray-800">Subscription</h2>
        </div>
        <div className="text-center py-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">Subscription</h2>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Current Plan</span>
          <span className="font-medium text-gray-800 capitalize">{userProfile.subscriptionTier}</span>
        </div>
        
        {userProfile.subscriptionTier !== 'free' ? (
          <>
            {(userProfile.subscriptionData?.expiresAt)
              ? (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Subscription ends on</span>
                  <span className="font-medium text-gray-800">{new Date(userProfile.subscriptionData.expiresAt).toLocaleDateString()}</span>
                </div>
              )
              : userProfile.subscriptionData?.renewalDate ? (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">Next Billing</span>
                  <span className="font-medium text-gray-800">{new Date(userProfile.subscriptionData.renewalDate).toLocaleDateString()}</span>
                </div>
              ) : null}
            {userProfile.subscriptionData?.cancelledAt && (
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Cancelled</span>
                <span className="font-medium text-gray-800">{new Date(userProfile.subscriptionData.cancelledAt).toLocaleDateString()}</span>
              </div>
            )}
            <Button 
              onClick={onManageSubscription}
              disabled={managingSubscription}
              className="w-full"
            >
              {managingSubscription ? 'Opening...' : 'Manage Subscription'}
            </Button>
          </>
        ) : (
          <>
            {userProfile.stripeCustomerId && (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">You previously had a subscription that may have expired or been cancelled.</p>
                {subscriptionError && (
                  <div className="mb-3 p-3 bg-risk/5 border border-risk/20 rounded-lg">
                    <p className="text-sm text-risk">{subscriptionError}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Button 
                    onClick={onManageSubscription}
                    disabled={managingSubscription}
                    variant="outlined"
                    className="w-full"
                  >
                    {managingSubscription ? 'Checking...' : 'Check Subscription Status'}
                  </Button>
                  <Button 
                    onClick={() => {
                      onClearSubscriptionError();
                      window.location.href = '/pricing';
                    }}
                    className="w-full"
                  >
                    Upgrade Plan
                  </Button>
                </div>
              </div>
            )}
            {!userProfile.stripeCustomerId && (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">Upgrade to unlock more features and higher scan limits.</p>
                <Button 
                  onClick={() => {
                    onClearSubscriptionError();
                    window.location.href = '/pricing';
                  }}
                  className="w-full"
                >
                  View Plans
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
} 
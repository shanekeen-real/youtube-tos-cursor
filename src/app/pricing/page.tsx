"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import PricingCard from '@/components/PricingCard';
import { SUBSCRIPTION_TIERS } from '@/types/subscription';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import type { SubscriptionTier } from '@/types/subscription';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
}

const featureMatrix = [
  { label: 'YouTube Channel Scans /mo', key: 'scanLimit', render: (v: any) => v === 'unlimited' ? 'Unlimited' : v === 'custom' ? 'Custom' : v },
  { label: 'Suggestions per Scan', key: 'suggestionsPerScan', render: (v: any) => v === 'all' ? 'All (10+)' : v },
  { label: 'Single Video Scan', key: 'singleScan', render: (v: any, tier: string) => '✔️' },
  { label: 'Bulk Video Scan', key: 'bulkScan', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'Revenue at Risk Calculator', key: 'revenueCalculator', render: (v: string) => v === 'basic' ? 'Basic' : v === 'full' ? 'Full' : v === 'full+export' ? 'Full + Export' : '❌' },
  { label: 'Export Reports (PDF/CSV)', key: 'exportReports', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'Monetization Risk Alerts', key: 'riskAlerts', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'Custom CPM/RPM Settings', key: 'customCPM', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'Priority Support', key: 'prioritySupport', render: (v: any) => v === 'dedicated' ? 'Dedicated' : v ? '✔️' : '❌' },
  { label: 'Team/Collaborator Access', key: 'teamSeats', render: (v: any) => v === 'unlimited' ? 'Unlimited' : v > 0 ? `${v} seats` : '❌' },
  { label: 'API Access', key: 'apiAccess', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'Custom Integrations', key: 'customIntegrations', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'White-label/Branding', key: 'whiteLabel', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'SLA/Uptime Guarantee', key: 'sla', render: (v: boolean) => v ? '✔️' : '❌' },
  { label: 'AI-Powered Policy Analysis', key: 'aiPolicyAnalysis', render: (v: boolean) => v ? '✔️ (Advanced)' : '❌' },
];

export default function PricingPage() {
  const { data: session } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTier, setLoadingTier] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const db = getFirestore(app);
        const userRef = doc(db, 'users', session.user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        }
      } catch (err: any) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session?.user?.id]);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!session?.user?.id) {
      window.location.href = '/api/auth/signin';
      return;
    }
    if (tier === 'enterprise') {
      window.location.href = 'mailto:sales@yourdomain.com?subject=Enterprise%20Plan%20Inquiry';
      return;
    }
    setLoadingTier(tier);
    try {
      const { data } = await axios.post('/api/create-checkout-session', { tier });
      const stripe = await stripePromise;
      if (stripe) {
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
      }
    } catch (error) {
      alert('Failed to start the upgrade process. Please try again.');
    } finally {
      setLoadingTier('');
    }
  };

  const tiers = ['free', 'pro', 'advanced', 'enterprise'] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Select the perfect plan for your YouTube channel. Start free and upgrade as you grow.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg bg-white mb-8">
            <thead>
              <tr>
                <th className="p-4 text-left font-bold text-lg">Feature</th>
                {tiers.map(tier => (
                  <th key={tier} className="p-4 text-center font-bold text-lg capitalize">
                    {SUBSCRIPTION_TIERS[tier].name}<br/>
                    <span className="text-base font-normal">
                      {SUBSCRIPTION_TIERS[tier].price === 0 ? '$0' : SUBSCRIPTION_TIERS[tier].price === 'contact' ? 'Contact' : `$${SUBSCRIPTION_TIERS[tier].price}${SUBSCRIPTION_TIERS[tier].billingCycle === 'monthly' ? '/mo' : ''}`}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map(row => (
                <tr key={row.label} className="border-t border-gray-100">
                  <td className="p-4 font-medium text-gray-900">{row.label}</td>
                  {tiers.map(tier => {
                    const limits = SUBSCRIPTION_TIERS[tier].limits;
                    let value = limits[row.key as keyof typeof limits];
                    if (row.key === 'singleScan') value = true; // All tiers have single scan
                    return (
                      <td key={tier} className="p-4 text-center">{row.render(value, tier)}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Upgrade Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {tiers.map(tier => {
            const isCurrent = userProfile && userProfile.subscriptionTier === tier;
            let btnText = 'Upgrade';
            if (tier === 'free') btnText = isCurrent ? 'Current Plan' : 'Get Started';
            if (tier === 'pro') btnText = isCurrent ? 'Current Plan' : 'Upgrade to Pro';
            if (tier === 'advanced') btnText = isCurrent ? 'Current Plan' : 'Upgrade to Advanced';
            if (tier === 'enterprise') btnText = isCurrent ? 'Current Plan' : 'Contact Sales';
            return (
              <div key={tier} className="flex flex-col items-center border border-gray-200 rounded-lg p-6 bg-white">
                <div className="text-2xl font-bold mb-2">{SUBSCRIPTION_TIERS[tier].name}</div>
                <div className="text-xl mb-4 text-gray-700">
                  {SUBSCRIPTION_TIERS[tier].price === 0 ? '$0' : SUBSCRIPTION_TIERS[tier].price === 'contact' ? 'Contact' : `$${SUBSCRIPTION_TIERS[tier].price}${SUBSCRIPTION_TIERS[tier].billingCycle === 'monthly' ? '/mo' : ''}`}
                </div>
                <button
                  className={`w-full py-2 px-4 rounded font-semibold ${isCurrent ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'} mb-2`}
                  onClick={() => handleUpgrade(tier)}
                  disabled={isCurrent || loadingTier === tier}
                >
                  {loadingTier === tier ? 'Processing...' : btnText}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
} 
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
import { CheckCircle, Crown, Star, Zap, Shield, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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
      const { data } = await axios.post('/api/create-checkout-session', { 
        tier, 
        billingCycle 
      });
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-display font-bold text-gray-800 mb-4">
            Choose Your <span className="text-yellow-500">Plan</span>
          </h1>
          <p className="text-subtitle text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your YouTube channel. Start free and upgrade as you grow.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white border border-gray-200 rounded-xl p-1 flex">
            <button
              className={`px-6 py-3 rounded-lg text-body font-semibold transition-colors ${
                billingCycle === 'monthly' 
                  ? 'bg-yellow-500 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-3 rounded-lg text-body font-semibold transition-colors ${
                billingCycle === 'annual' 
                  ? 'bg-yellow-500 text-gray-900' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual <span className="ml-1 text-xs">(2 months free!)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {tiers.map((tier, index) => {
            const isCurrent = userProfile && userProfile.subscriptionTier === tier;
            const isPopular = tier === 'pro';
            const tierData = SUBSCRIPTION_TIERS[tier];
            
            let price = tierData.price;
            if (tierData.price !== 0 && tierData.price !== 'contact' && billingCycle === 'annual') {
              price = tier === 'pro' ? 149.99 : tier === 'advanced' ? 489.99 : tierData.price;
            }

            return (
              <div key={tier} className={`relative ${isPopular ? 'lg:scale-105' : ''}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-yellow-500 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className={`bg-white border-2 rounded-xl p-6 h-full flex flex-col ${
                  isPopular ? 'border-yellow-500 shadow-lg' : 'border-gray-200 hover:border-yellow-300'
                } transition-all duration-200`}>
                  
                  {/* Tier Header */}
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {tier === 'free' && <Shield className="w-5 h-5 text-gray-500" />}
                      {tier === 'pro' && <Star className="w-5 h-5 text-yellow-500" />}
                      {tier === 'advanced' && <Zap className="w-5 h-5 text-yellow-500" />}
                      {tier === 'enterprise' && <Crown className="w-5 h-5 text-yellow-500" />}
                      <h3 className="text-title font-semibold text-gray-800">{tierData.name}</h3>
                    </div>
                    
                    <div className="mb-2">
                      <span className="text-3xl font-bold text-gray-800">
                        {price === 0 ? '$0' : price === 'contact' ? 'Contact' : `$${price}`}
                      </span>
                      {price !== 0 && price !== 'contact' && (
                        <span className="text-gray-600 ml-1">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-caption text-gray-600">{tierData.description}</p>
                  </div>

                  {/* Features */}
                  <div className="flex-1 space-y-3 mb-6">
                    {tierData.features.slice(0, 6).map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="w-4 h-4 text-safe flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                    {tierData.features.length > 6 && (
                      <div className="text-caption text-gray-500">
                        +{tierData.features.length - 6} more features
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleUpgrade(tier)}
                    disabled={isCurrent || loadingTier === tier}
                    variant={isPopular ? "default" : "outline"}
                    className="w-full"
                  >
                    {loadingTier === tier ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : isCurrent ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Current Plan
                      </div>
                    ) : tier === 'free' ? (
                      'Get Started'
                    ) : tier === 'enterprise' ? (
                      'Contact Sales'
                    ) : (
                      <div className="flex items-center gap-2">
                        Upgrade to {tierData.name}
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-title font-semibold text-gray-800 mb-2">Feature Comparison</h2>
            <p className="text-gray-600">Compare all features across our plans</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 text-left font-semibold text-gray-800">Feature</th>
                  {tiers.map(tier => (
                    <th key={tier} className="p-4 text-center font-semibold text-gray-800 capitalize">
                      {SUBSCRIPTION_TIERS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureMatrix.map((row, rowIndex) => (
                  <tr key={row.label} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="p-4 font-medium text-gray-800">{row.label}</td>
                    {tiers.map(tier => {
                      const limits = SUBSCRIPTION_TIERS[tier].limits;
                      let value = limits[row.key as keyof typeof limits];
                      if (row.key === 'singleScan') value = true; // All tiers have single scan
                      return (
                        <td key={tier} className="p-4 text-center">
                          <span className="text-sm">{row.render(value, tier)}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h2 className="text-title font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-600 mb-8">Have questions? We're here to help.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 mb-2">Can I change plans anytime?</h3>
              <p className="text-sm text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 mb-2">Is there a free trial?</h3>
              <p className="text-sm text-gray-600">Yes! Start with our free plan and upgrade when you need more features.</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-gray-600">We accept all major credit cards and PayPal. All payments are processed securely through Stripe.</p>
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-800 mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-gray-600">Absolutely. You can cancel your subscription at any time with no cancellation fees.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 
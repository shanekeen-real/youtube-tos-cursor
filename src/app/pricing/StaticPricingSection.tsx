"use client";
import React, { useState, useContext } from 'react';
import { PricingCard } from '@/lib/imports';
import { SUBSCRIPTION_TIERS, type SubscriptionTier, type SubscriptionLimits } from '@/types/subscription';
import { SUBSCRIPTION_TIER_ORDER } from '@/lib/imports';
import { CheckCircle, Crown, Star, Zap, Shield, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { UIButton as Button } from '@/lib/imports';
import { AuthContext } from '@/components/ClientLayout';

// Type definitions for feature matrix renderers
type ScanLimitValue = number | 'unlimited' | 'custom';
type SuggestionsValue = number | 'all';
type PrioritySupportValue = boolean | 'dedicated';
type TeamSeatsValue = number | 'unlimited';

interface FeatureMatrixRow {
  label: string;
  key: keyof SubscriptionLimits | 'singleScan';
  render: (value: unknown, tier?: string) => string;
}

const featureMatrix: FeatureMatrixRow[] = [
  { label: 'YouTube Channel Scans /mo', key: 'scanLimit', render: (v: unknown) => {
    const val = v as ScanLimitValue;
    return val === 'unlimited' ? 'Unlimited' : val === 'custom' ? 'Custom' : String(val);
  }},
  { label: 'Suggestions per Scan', key: 'suggestionsPerScan', render: (v: unknown) => {
    const val = v as SuggestionsValue;
    return val === 'all' ? 'All (10+)' : val === 5 ? '5+' : String(val);
  }},
  { label: 'Single Video Scan', key: 'singleScan', render: (v: unknown, tier?: string) => '✔️' },
  { label: 'Bulk Video Scan', key: 'bulkScan', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'Revenue at Risk Calculator', key: 'revenueCalculator', render: (v: unknown) => {
    const val = v as string;
    return val === 'basic' ? 'Basic' : val === 'full' ? 'Full' : val === 'full+export' ? 'Full + Export' : '❌';
  }},
  { label: 'Export Reports (PDF/CSV)', key: 'exportReports', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'Monetization Risk Alerts', key: 'riskAlerts', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'Custom CPM/RPM Settings', key: 'customCPM', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'Priority Support', key: 'prioritySupport', render: (v: unknown) => {
    const val = v as PrioritySupportValue;
    return val === 'dedicated' ? 'Dedicated' : val ? '✔️' : '❌';
  }},
  { label: 'Team/Collaborator Access', key: 'teamSeats', render: (v: unknown) => {
    const val = v as TeamSeatsValue;
    return val === 'unlimited' ? 'Unlimited' : val > 0 ? `${val} seats` : '❌';
  }},
  { label: 'API Access', key: 'apiAccess', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'Custom Integrations', key: 'customIntegrations', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'White-label/Branding', key: 'whiteLabel', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'SLA/Uptime Guarantee', key: 'sla', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
  { label: 'AI-Powered Policy Analysis', key: 'aiPolicyAnalysis', render: (v: unknown) => (v as boolean) ? '✔️ (Advanced)' : '❌' },
  { label: 'AI Content Detection', key: 'aiContentDetection', render: (v: unknown) => (v as boolean) ? '✔️' : '❌' },
];

export default function StaticPricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [featureComparisonOpen, setFeatureComparisonOpen] = useState(false);
  const tiers = SUBSCRIPTION_TIER_ORDER;
  const auth = useContext(AuthContext);

  // Helper function to calculate display price
  const getDisplayPrice = (tier: SubscriptionTier, cycle: 'monthly' | 'annual') => {
    const tierData = SUBSCRIPTION_TIERS[tier];
    if (tierData.price === 0 || tierData.price === 'contact') return tierData.price;
    if (cycle === 'annual') {
      const annualPrice = tier === 'pro' ? 149.99 : tier === 'advanced' ? 489.99 : tierData.price;
      return (annualPrice / 12).toFixed(2); // Show as monthly equivalent
    }
    return tierData.price;
  };

  return (
    <section className="w-full">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="text-sm font-medium text-yellow-600 mb-2">Pricing</div>
        <h1 className="text-display font-bold text-gray-800 mb-4">
          Choose Your Plan
        </h1>
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
            Annual
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {tiers.map((tier, index) => {
          const isPopular = tier === 'pro';
          const tierData = SUBSCRIPTION_TIERS[tier];
          const displayPrice = getDisplayPrice(tier, billingCycle);
          let buttonText = '';
          if (tier === 'free') {
            buttonText = 'Get Started';
          } else if (tier === 'enterprise') {
            buttonText = 'Contact Sales';
          } else {
            buttonText = `Choose ${tierData.name}`;
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
                    {tier === 'free' && <Shield className="w-4 h-4 text-gray-500" />}
                    {tier === 'pro' && <Star className="w-4 h-4 text-yellow-500" />}
                    {tier === 'advanced' && <Zap className="w-4 h-4 text-yellow-500" />}
                    {tier === 'enterprise' && <Crown className="w-4 h-4 text-yellow-500" />}
                    <h3 className="text-subtitle font-semibold text-gray-800">{tierData.name}</h3>
                  </div>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-gray-800">
                      {displayPrice === 0 ? '$0' : displayPrice === 'contact' ? 'Contact' : `$${displayPrice}`}
                    </span>
                    {displayPrice !== 0 && displayPrice !== 'contact' && (
                      <span className="text-gray-600 ml-1">
                        /mo
                        {billingCycle === 'annual' && (
                          <span className="text-xs block mt-1 text-gray-500">billed annually</span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-gray-600">{tierData.description}</p>
                </div>
                {/* Features */}
                <div className="flex-1 space-y-3 mb-6">
                  {tierData.features.slice(0, 6).map((feature: string, featureIndex: number) => (
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
                {tier === 'enterprise' ? (
                  <Button
                    onClick={() => window.location.href = 'mailto:support@yellowdollar.com?subject=Enterprise%20Plan%20Inquiry'}
                    variant={isPopular ? "default" : "outline"}
                    className="w-full"
                  >
                    <div className="flex items-center gap-2">
                      Contact Sales
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Button>
                ) : (
                  <Button
                    onClick={() => auth?.setAuthOpen(true)}
                    variant={isPopular ? "default" : "outline"}
                    className="w-full"
                  >
                    <div className="flex items-center gap-2">
                      {buttonText}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Feature Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-8">
        <button
          className="w-full flex items-center justify-between p-6 border-b border-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          aria-expanded={featureComparisonOpen}
          aria-controls="feature-comparison-table"
          onClick={() => setFeatureComparisonOpen((open) => !open)}
        >
          <div className="flex flex-col items-start">
            <h2 className="text-title font-semibold text-gray-800 mb-1">Feature Comparison</h2>
            <p className="text-gray-600 text-sm">Compare all features across our plans</p>
          </div>
          {featureComparisonOpen ? (
            <ChevronUp className="w-6 h-6 text-gray-500" />
          ) : (
            <ChevronDown className="w-6 h-6 text-gray-500" />
          )}
        </button>
        {featureComparisonOpen && (
          <div className="overflow-x-auto transition-all duration-300" id="feature-comparison-table">
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
                      let value: unknown;
                      if (row.key === 'singleScan') {
                        value = true; // All tiers have single scan
                      } else {
                        value = limits[row.key as keyof typeof limits];
                      }
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
        )}
      </div>
    </section>
  );
} 
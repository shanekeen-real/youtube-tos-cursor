"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { PricingCard } from '@/lib/imports';
import { SUBSCRIPTION_TIERS, type SubscriptionTier, type SubscriptionLimits } from '@/types/subscription';
import { SUBSCRIPTION_TIER_ORDER } from '@/lib/imports';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import { CheckCircle, Crown, Star, Zap, Shield, Users, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { UIButton as Button } from '@/lib/imports';
import { getAuth } from 'firebase/auth';
import PricingSection from './PricingSection';

// Type definitions for feature matrix renderers
type ScanLimitValue = number | 'unlimited' | 'custom';
type SuggestionsValue = number | 'all';
type PrioritySupportValue = boolean | 'dedicated';
type TeamSeatsValue = number | 'unlimited';

// Interface for feature matrix row
interface FeatureMatrixRow {
  label: string;
  key: keyof SubscriptionLimits | 'singleScan';
  render: (value: unknown, tier?: string) => string;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
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

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <PricingSection />
      </div>
    </main>
  );
} 
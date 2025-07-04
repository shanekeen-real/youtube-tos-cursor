export type SubscriptionTier = 'free' | 'pro' | 'advanced' | 'enterprise';

export interface SubscriptionLimits {
  scanLimit: number | 'unlimited' | 'custom';
  suggestionsPerScan: number | 'all';
  bulkScan: boolean;
  revenueCalculator: 'none' | 'basic' | 'full' | 'full+export';
  exportReports: boolean;
  riskAlerts: boolean;
  customCPM: boolean;
  prioritySupport: boolean | 'dedicated';
  teamSeats: number | 'unlimited';
  apiAccess: boolean;
  customIntegrations: boolean;
  whiteLabel: boolean;
  sla: boolean;
  aiPolicyAnalysis: boolean;
  exportFormats?: string[];
}

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: number | 'contact';
  billingCycle: 'monthly' | 'one-time' | 'contact';
  description: string;
  features: string[];
  limits: SubscriptionLimits;
  stripePriceId?: string;
  recommended?: boolean;
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, PricingTier> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    billingCycle: 'one-time',
    description: 'Get started with basic YouTube channel scans and suggestions.',
    features: [
      '1 YouTube channel scan per month',
      '3 suggestions per scan (limited)',
      'Single video scan',
      'Basic revenue at risk calculator',
      'Custom CPM/RPM settings',
      'AI-powered policy analysis (advanced)',
    ],
    limits: {
      scanLimit: 1,
      suggestionsPerScan: 3,
      bulkScan: false,
      revenueCalculator: 'basic',
      exportReports: false,
      riskAlerts: false,
      customCPM: true,
      prioritySupport: false,
      teamSeats: 0,
      apiAccess: false,
      customIntegrations: false,
      whiteLabel: false,
      sla: false,
      aiPolicyAnalysis: true,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 14.99,
    billingCycle: 'monthly',
    description: 'For creators who need more scans, suggestions, and export features.',
    features: [
      '30 YouTube channel scans per month',
      '5 suggestions per scan',
      'Single video scan',
      'Full revenue at risk calculator',
      'Export reports (PDF/CSV)',
      'Monetization risk alerts',
      'Custom CPM/RPM settings',
      'AI-powered policy analysis (advanced)',
    ],
    limits: {
      scanLimit: 30,
      suggestionsPerScan: 5,
      bulkScan: false,
      revenueCalculator: 'full',
      exportReports: true,
      riskAlerts: true,
      customCPM: true,
      prioritySupport: false,
      teamSeats: 0,
      apiAccess: false,
      customIntegrations: false,
      whiteLabel: false,
      sla: false,
      aiPolicyAnalysis: true,
    },
    recommended: true,
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    price: 48.99,
    billingCycle: 'monthly',
    description: 'For teams and professionals who need unlimited scans and collaboration.',
    features: [
      'Unlimited YouTube channel scans',
      'All suggestions per scan (10+)',
      'Single & bulk video scan',
      'Full revenue at risk calculator + export',
      'Export reports (PDF/CSV)',
      'Monetization risk alerts',
      'Custom CPM/RPM settings',
      'Priority support',
      'Team/collaborator access (3 seats)',
      'API access',
      'AI-powered policy analysis (advanced)',
    ],
    limits: {
      scanLimit: 'unlimited',
      suggestionsPerScan: 'all',
      bulkScan: true,
      revenueCalculator: 'full+export',
      exportReports: true,
      riskAlerts: true,
      customCPM: true,
      prioritySupport: true,
      teamSeats: 3,
      apiAccess: true,
      customIntegrations: false,
      whiteLabel: false,
      sla: false,
      aiPolicyAnalysis: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'contact',
    billingCycle: 'contact',
    description: 'Custom solutions for large organizations and agencies.',
    features: [
      'Custom YouTube channel scan limits',
      'All suggestions per scan (10+)',
      'Single & bulk video scan',
      'Full revenue at risk calculator + export',
      'Export reports (PDF/CSV)',
      'Monetization risk alerts',
      'Custom CPM/RPM settings',
      'Dedicated priority support',
      'Unlimited team/collaborator access',
      'API access',
      'Custom integrations',
      'White-label/branding',
      'SLA/Uptime guarantee',
      'AI-powered policy analysis (advanced)',
    ],
    limits: {
      scanLimit: 'custom',
      suggestionsPerScan: 'all',
      bulkScan: true,
      revenueCalculator: 'full+export',
      exportReports: true,
      riskAlerts: true,
      customCPM: true,
      prioritySupport: 'dedicated',
      teamSeats: 'unlimited',
      apiAccess: true,
      customIntegrations: true,
      whiteLabel: true,
      sla: true,
      aiPolicyAnalysis: true,
    },
  },
};

export const getTierLimits = (tier: SubscriptionTier): SubscriptionLimits => {
  return SUBSCRIPTION_TIERS[tier].limits;
};

export const isUnlimitedScans = (tier: SubscriptionTier): boolean => {
  return SUBSCRIPTION_TIERS[tier].limits.scanLimit === 'unlimited' || SUBSCRIPTION_TIERS[tier].limits.scanLimit === 'custom';
}; 
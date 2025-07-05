import { SubscriptionTier, SUBSCRIPTION_TIERS, getTierLimits } from '@/types/subscription';

export interface UserSubscriptionData {
  subscriptionTier: SubscriptionTier;
  scanCount: number;
  scanLimit: number | 'unlimited' | 'custom';
  suggestionsPerScan?: number | 'all';
  subscriptionData?: {
    tier: SubscriptionTier;
    limits: any;
    updatedAt: string;
    cancelledAt?: string;
  };
}

export const checkUserCanScan = (userData: any): { canScan: boolean; reason?: string } => {
  if (!userData || !userData.subscriptionTier || typeof userData.scanCount !== 'number') {
    return { canScan: false, reason: `Unable to verify subscription status. Please contact support.` };
  }
  const tier = userData.subscriptionTier;
  const limits = getTierLimits(tier);
  if (limits.scanLimit === 'unlimited' || limits.scanLimit === 'custom') {
    return { canScan: true };
  }
  if (userData.scanCount >= limits.scanLimit) {
    return {
      canScan: false,
      reason: `You have reached your ${tier} tier scan limit of ${limits.scanLimit} scans. Please upgrade for more.`
    };
  }
  return { canScan: true };
};

export const checkSuggestionsPerScan = (tier: SubscriptionTier, requested: number): { allowed: boolean; max: number | 'all' } => {
  const limits = getTierLimits(tier);
  if (limits.suggestionsPerScan === 'all') {
    return { allowed: true, max: 'all' };
  }
  if (requested <= limits.suggestionsPerScan) {
    return { allowed: true, max: limits.suggestionsPerScan };
  }
  return { allowed: false, max: limits.suggestionsPerScan };
};

export const getUpgradeSuggestion = (currentTier: SubscriptionTier): { nextTier: SubscriptionTier; price: string; features: string[] } => {
  const tiers: SubscriptionTier[] = ['free', 'pro', 'advanced', 'enterprise'];
  const currentIndex = tiers.indexOf(currentTier);
  
  if (currentIndex >= tiers.length - 1) {
    return {
      nextTier: 'enterprise',
      price: 'Contact Sales',
      features: ['Custom pricing', 'Dedicated support']
    };
  }
  
  const nextTier = tiers[currentIndex + 1];
  const nextTierData = SUBSCRIPTION_TIERS[nextTier];
  
  return {
    nextTier,
    price: nextTierData.billingCycle === 'monthly' ? `$${nextTierData.price}/mo` : `$${nextTierData.price}`,
    features: nextTierData.features.slice(0, 3) // Show first 3 features
  };
};

export const getDowngradeOptions = (currentTier: SubscriptionTier): { tier: SubscriptionTier; name: string; price: string; savings: string }[] => {
  const tiers: SubscriptionTier[] = ['free', 'pro', 'advanced', 'enterprise'];
  const currentIndex = tiers.indexOf(currentTier);
  
  if (currentIndex <= 0) {
    return []; // No downgrade options for free tier
  }
  
  const options = [];
  const currentTierData = SUBSCRIPTION_TIERS[currentTier];
  const currentPrice = typeof currentTierData.price === 'number' ? currentTierData.price : 0;
  
  // Get all lower tiers
  for (let i = currentIndex - 1; i >= 0; i--) {
    const lowerTier = tiers[i];
    const lowerTierData = SUBSCRIPTION_TIERS[lowerTier];
    const lowerPrice = typeof lowerTierData.price === 'number' ? lowerTierData.price : 0;
    const savings = currentPrice - lowerPrice;
    
    options.push({
      tier: lowerTier,
      name: lowerTierData.name,
      price: lowerTierData.billingCycle === 'monthly' ? `$${lowerTierData.price}/mo` : `$${lowerTierData.price}`,
      savings: savings > 0 ? `Save $${savings}/mo` : 'Free'
    });
  }
  
  return options;
};

export const formatTierDisplay = (tier: SubscriptionTier): { name: string; color: string; gradient?: boolean } => {
  switch (tier) {
    case 'free':
      return { name: 'Free', color: '#2563eb' };
    case 'pro':
      return { name: 'Pro', color: '#7c3aed', gradient: true };
    case 'advanced':
      return { name: 'Advanced', color: '#059669', gradient: true };
    case 'enterprise':
      return { name: 'Enterprise', color: '#dc2626', gradient: true };
    default:
      return { name: 'Unknown', color: '#6b7280' };
  }
};

export const getTierBenefits = (tier: SubscriptionTier): string[] => {
  const limits = getTierLimits(tier);
  const benefits: string[] = [];
  
  if (typeof limits.scanLimit === 'number' && limits.scanLimit >= 99999) {
    benefits.push('Unlimited scans');
  } else {
    benefits.push(`${limits.scanLimit} scans per month`);
  }
  
  if (limits.revenueCalculator) {
    benefits.push('Revenue impact calculator');
  }
  
  if (limits.exportFormats?.length) {
    benefits.push(`Export formats: ${limits.exportFormats.join(', ')}`);
  }
  
  if (limits.prioritySupport) {
    benefits.push('Priority support');
  }
  
  if (limits.bulkScan) {
    benefits.push('Bulk video scan');
  }
  
  if (limits.apiAccess) {
    benefits.push('API access');
  }
  
  if (limits.teamSeats && (limits.teamSeats === 'unlimited' || limits.teamSeats > 1)) {
    if (limits.teamSeats === 'unlimited') {
      benefits.push('Team collaboration (unlimited seats)');
    } else {
      benefits.push(`Team collaboration (${limits.teamSeats} seats)`);
    }
  }
  
  if (limits.customIntegrations) {
    benefits.push('Custom integrations');
  }
  
  return benefits;
};

export const checkUserCanExport = (userData: any): { canExport: boolean; reason?: string } => {
  if (!userData || !userData.subscriptionTier) {
    return { canExport: false, reason: 'Unable to verify subscription status. Please contact support.' };
  }
  
  const tier = userData.subscriptionTier;
  const limits = getTierLimits(tier);
  
  if (!limits.exportReports) {
    return { 
      canExport: false, 
      reason: `Export functionality is not available on the ${tier} tier. Please upgrade to Pro or higher to export reports.` 
    };
  }
  
  return { canExport: true };
}; 
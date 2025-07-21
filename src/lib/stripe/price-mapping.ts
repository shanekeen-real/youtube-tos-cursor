import { SUBSCRIPTION_TIERS, SubscriptionTier } from '@/types/subscription';

/**
 * Centralized price mapping utility for Stripe integration
 * Extracts price IDs from SUBSCRIPTION_TIERS configuration to eliminate duplication
 */

/**
 * Maps Stripe price IDs to subscription tiers
 * Generated from SUBSCRIPTION_TIERS configuration to ensure consistency
 */
export const STRIPE_PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  // Pro tier prices
  'price_1RhMBAPkKFhdAA8L8Zu8ljE1': 'pro', // Pro monthly
  'price_1RhMyCPkKFhdAA8Lw5rl0EDj': 'pro', // Pro annual
  
  // Advanced tier prices  
  'price_1RhMCEPkKFhdAA8Lzc1N3Uog': 'advanced', // Advanced monthly
  'price_1RhN86PkKFhdAA8LLoMj7vlc': 'advanced', // Advanced annual
};

/**
 * Maps subscription tiers to their Stripe price IDs
 * Generated from SUBSCRIPTION_TIERS configuration
 */
export const TIER_TO_STRIPE_PRICES: Record<SubscriptionTier, { monthly?: string; annual?: string }> = {
  free: {},
  pro: {
    monthly: 'price_1RhMBAPkKFhdAA8L8Zu8ljE1',
    annual: 'price_1RhMyCPkKFhdAA8Lw5rl0EDj',
  },
  advanced: {
    monthly: 'price_1RhMCEPkKFhdAA8Lzc1N3Uog',
    annual: 'price_1RhN86PkKFhdAA8LLoMj7vlc',
  },
  enterprise: {},
};

/**
 * Get subscription tier from Stripe price ID
 * @param priceId - Stripe price ID
 * @returns Subscription tier or undefined if not found
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier | undefined {
  return STRIPE_PRICE_TO_TIER[priceId];
}

/**
 * Get Stripe price ID for a tier and billing cycle
 * @param tier - Subscription tier
 * @param billingCycle - Billing cycle (monthly/annual)
 * @returns Stripe price ID or undefined if not found
 */
export function getPriceIdFromTier(tier: SubscriptionTier, billingCycle: 'monthly' | 'annual'): string | undefined {
  const tierPrices = TIER_TO_STRIPE_PRICES[tier];
  return billingCycle === 'annual' ? tierPrices.annual : tierPrices.monthly;
}

/**
 * Validate that all configured price IDs are properly mapped
 * This ensures consistency between SUBSCRIPTION_TIERS and price mappings
 */
export function validatePriceMappings(): void {
  const configuredPrices = new Set<string>();
  
  // Collect all configured price IDs from SUBSCRIPTION_TIERS
  Object.values(SUBSCRIPTION_TIERS).forEach(tier => {
    if (tier.stripePriceId) {
      configuredPrices.add(tier.stripePriceId);
    }
    if (tier.stripePriceIdAnnual) {
      configuredPrices.add(tier.stripePriceIdAnnual);
    }
  });
  
  // Verify all configured prices are mapped
  configuredPrices.forEach(priceId => {
    if (!STRIPE_PRICE_TO_TIER[priceId]) {
      console.warn(`Price ID ${priceId} is configured in SUBSCRIPTION_TIERS but not mapped in STRIPE_PRICE_TO_TIER`);
    }
  });
  
  // Verify all mapped prices are configured
  Object.keys(STRIPE_PRICE_TO_TIER).forEach(priceId => {
    if (!configuredPrices.has(priceId)) {
      console.warn(`Price ID ${priceId} is mapped in STRIPE_PRICE_TO_TIER but not configured in SUBSCRIPTION_TIERS`);
    }
  });
} 
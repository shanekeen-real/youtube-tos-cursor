/**
 * Centralized constants for subscription configuration
 * These constants define subscription tiers and related settings
 */

/**
 * Subscription tier types
 */
export const SUBSCRIPTION_TIERS = ['free', 'pro', 'advanced', 'enterprise'] as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[number];

/**
 * Subscription tier order for display
 */
export const SUBSCRIPTION_TIER_ORDER = ['free', 'pro', 'advanced', 'enterprise'] as const;

/**
 * Subscription tier display names
 */
export const SUBSCRIPTION_TIER_NAMES = {
  free: 'Free',
  pro: 'Pro',
  advanced: 'Advanced',
  enterprise: 'Enterprise'
} as const;

/**
 * Subscription tier colors for UI
 */
export const SUBSCRIPTION_TIER_COLORS = {
  free: 'gray',
  pro: 'blue',
  advanced: 'purple',
  enterprise: 'yellow'
} as const;

/**
 * Utility function to get tier index
 * @param tier - The subscription tier
 * @returns The index of the tier in the order array
 */
export function getTierIndex(tier: SubscriptionTier): number {
  return SUBSCRIPTION_TIER_ORDER.indexOf(tier);
}

/**
 * Utility function to get next tier
 * @param currentTier - The current subscription tier
 * @returns The next tier or null if at the end
 */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const currentIndex = getTierIndex(currentTier);
  if (currentIndex < SUBSCRIPTION_TIER_ORDER.length - 1) {
    return SUBSCRIPTION_TIER_ORDER[currentIndex + 1];
  }
  return null;
}

/**
 * Utility function to get previous tier
 * @param currentTier - The current subscription tier
 * @returns The previous tier or null if at the beginning
 */
export function getPreviousTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  const currentIndex = getTierIndex(currentTier);
  if (currentIndex > 0) {
    return SUBSCRIPTION_TIER_ORDER[currentIndex - 1];
  }
  return null;
}

/**
 * Utility function to check if tier is upgradeable
 * @param currentTier - The current subscription tier
 * @returns True if the tier can be upgraded
 */
export function isUpgradeable(currentTier: SubscriptionTier): boolean {
  return getNextTier(currentTier) !== null;
}

/**
 * Utility function to check if tier is downgradeable
 * @param currentTier - The current subscription tier
 * @returns True if the tier can be downgraded
 */
export function isDowngradeable(currentTier: SubscriptionTier): boolean {
  return getPreviousTier(currentTier) !== null;
} 
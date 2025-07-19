/**
 * Maps category keys to human-friendly names
 */
export const CATEGORY_LABELS: { [key: string]: string } = {
  CONTENT_SAFETY_VIOLENCE: 'Violence & Graphic Content',
  CONTENT_SAFETY_DANGEROUS_ACTS: 'Dangerous Acts & Challenges',
  CONTENT_SAFETY_HARMFUL_CONTENT: 'Harmful or Dangerous Content',
  CONTENT_SAFETY_CHILD_SAFETY: 'Child Safety',
  COMMUNITY_STANDARDS_HARASSMENT: 'Harassment & Cyberbullying',
  COMMUNITY_STANDARDS_HATE_SPEECH: 'Hate Speech',
  COMMUNITY_STANDARDS_SPAM: 'Spam, Deceptive Practices & Scams',
  COMMUNITY_STANDARDS_MISINFORMATION: 'Misinformation',
  ADVERTISER_FRIENDLY_SEXUAL_CONTENT: 'Sexual Content',
  ADVERTISER_FRIENDLY_PROFANITY: 'Profanity & Inappropriate Language',
  ADVERTISER_FRIENDLY_CONTROVERSIAL: 'Controversial or Sensitive Topics',
  ADVERTISER_FRIENDLY_BRAND_SAFETY: 'Brand Safety Issues',
  LEGAL_COMPLIANCE_COPYRIGHT: 'Copyright & Intellectual Property',
  LEGAL_COMPLIANCE_PRIVACY: 'Privacy & Personal Information',
  LEGAL_COMPLIANCE_TRADEMARK: 'Trademark Violations',
  LEGAL_COMPLIANCE_LEGAL_REQUESTS: 'Legal Requests & Compliance',
  MONETIZATION_AD_POLICIES: 'Ad-Friendly Content Guidelines',
  MONETIZATION_SPONSORED_CONTENT: 'Sponsored Content Disclosure',
  MONETIZATION_MONETIZATION_ELIGIBILITY: 'Monetization Eligibility',
};

/**
 * Get human-friendly label for a category
 */
export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category.replace(/_/g, ' ');
}

/**
 * All recognized content types for context-aware filtering
 */
export const RECOGNIZED_CONTEXTS = [
  'gaming', 'educational', 'entertainment', 'news', 'music', 'comedy', 
  'tutorial', 'review', 'vlog', 'documentary', 'sports', 'technology', 
  'fashion', 'cooking', 'travel'
]; 
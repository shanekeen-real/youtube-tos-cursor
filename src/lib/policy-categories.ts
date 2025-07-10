// YouTube Policy Taxonomy - Based on actual Community Guidelines
export const YOUTUBE_POLICY_CATEGORIES = {
  CONTENT_SAFETY: {
    VIOLENCE: 'Violence & Graphic Content',
    DANGEROUS_ACTS: 'Dangerous Acts & Challenges',
    HARMFUL_CONTENT: 'Harmful or Dangerous Content',
    CHILD_SAFETY: 'Child Safety',
  },
  COMMUNITY_STANDARDS: {
    HARASSMENT: 'Harassment & Cyberbullying',
    HATE_SPEECH: 'Hate Speech',
    SPAM: 'Spam, Deceptive Practices & Scams',
    MISINFORMATION: 'Misinformation',
  },
  ADVERTISER_FRIENDLY: {
    SEXUAL_CONTENT: 'Sexual Content',
    PROFANITY: 'Profanity & Inappropriate Language',
    CONTROVERSIAL: 'Controversial or Sensitive Topics',
    BRAND_SAFETY: 'Brand Safety Issues',
  },
  LEGAL_COMPLIANCE: {
    COPYRIGHT: 'Copyright & Intellectual Property',
    PRIVACY: 'Privacy & Personal Information',
    TRADEMARK: 'Trademark Violations',
    LEGAL_REQUESTS: 'Legal Requests & Compliance',
  },
  MONETIZATION: {
    AD_POLICIES: 'Ad-Friendly Content Guidelines',
    SPONSORED_CONTENT: 'Sponsored Content Disclosure',
    MONETIZATION_ELIGIBILITY: 'Monetization Eligibility',
  }
} as const; 
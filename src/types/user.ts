import { SubscriptionTier } from './subscription';

// User profile data structure
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  subscriptionTier: SubscriptionTier;
  scanCount: number;
  lastScanAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // YouTube integration
  youtube?: {
    channel?: {
      id: string;
      title: string;
      description?: string;
      subscriberCount?: number;
      viewCount?: number;
      videoCount?: number;
      customUrl?: string;
      thumbnails?: {
        default?: string;
        medium?: string;
        high?: string;
      };
    };
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  };
  
  // Subscription data
  subscriptionData?: {
    tier: SubscriptionTier;
    limits: {
      scanLimit: number | 'unlimited' | 'custom';
      suggestionsPerScan: number | 'all';
      [key: string]: any; // Allow for future limit additions
    };
    updatedAt: string;
    cancelledAt?: string;
    expiresAt?: string;
    renewalDate?: string;
  };
  
  // 2FA settings
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  
  // Preferences
  preferences?: {
    defaultCPM?: number;
    defaultRPM?: number;
    emailNotifications?: boolean;
    riskThreshold?: number;
  };
}

// User data for subscription checks (partial user data)
export interface UserSubscriptionData {
  subscriptionTier: SubscriptionTier;
  scanCount: number;
  scanLimit?: number | 'unlimited' | 'custom';
  suggestionsPerScan?: number | 'all';
  subscriptionData?: {
    tier: SubscriptionTier;
    limits: {
      scanLimit: number | 'unlimited' | 'custom';
      suggestionsPerScan: number | 'all';
      [key: string]: any;
    };
    updatedAt: string;
    cancelledAt?: string;
  };
}

// Channel context for AI analysis
export interface ChannelContext {
  channelId: string;
  channelTitle: string;
  subscriberCount?: number;
  totalViews?: number;
  videoCount?: number;
  averageViews?: number;
  uploadFrequency?: string;
  contentCategories?: string[];
  audienceDemographics?: {
    ageRanges?: string[];
    locations?: string[];
    languages?: string[];
  };
  contentStyle?: {
    tone?: string;
    format?: string;
    length?: string;
    engagement?: string;
  };
  monetizationStatus?: 'enabled' | 'disabled' | 'limited';
  policyHistory?: {
    strikes?: number;
    warnings?: number;
    demonetizations?: number;
  };
  // Additional properties for AI detection
  channelData?: {
    accountDate?: string;
    subscriberCount?: number;
    videoCount?: number;
  };
  aiIndicators?: {
    aiProbability?: number;
  };
}

// Video metadata for analysis
export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  publishedAt?: string;
  tags?: string[];
  category?: string;
  language?: string;
  thumbnail?: string;
}

// Error types for better error handling
export interface AnalysisError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export interface APIError {
  error: string;
  code?: string;
  status?: number;
  details?: Record<string, any>;
} 
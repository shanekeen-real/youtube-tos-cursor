// YouTube API response types
export interface YouTubeVideoSnippet {
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnails?: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
}

export interface YouTubeVideoItem {
  id: {
    videoId: string;
  };
  snippet: YouTubeVideoSnippet;
}

// Legal channel data that can be collected via YouTube API
export interface LegalChannelData {
  // Basic channel info
  channelId: string;
  title: string;
  description: string;
  
  // Verification and status
  verified: boolean;
  category: string;
  accountDate: string; // publishedAt
  
  // Statistics (public data only)
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  
  // Enhanced data from video analysis
  averageVideoLength?: number;
  uploadFrequency?: number;
  titlePatterns?: string[];
  descriptionTemplates?: string[];
  commonTags?: string[];
  
  // Upload patterns
  uploadSchedule?: {
    averageDaysBetween: number;
    preferredDays: string[];
    preferredTimes: string[];
  };
}

// AI detection indicators
export interface AIDetectionIndicators {
  uploadConsistency: number; // 0-1, perfect consistency = AI indicator
  titleVariation: number; // 0-1, low variation = AI indicator
  descriptionTemplates: number; // Count of template usage
  subToVideoRatio: number; // Suspicious if very high
  viewToSubRatio: number; // Bot-like if very low
  videosPerDay: number; // Suspicious if very high
  aiProbability: number; // Overall AI probability 0-100
  confidence: number; // Confidence in AI detection 0-100
}

// Complete channel context
export interface ChannelContext {
  channelData: LegalChannelData;
  aiIndicators: AIDetectionIndicators;
  lastUpdated: string;
  cacheKey: string;
}

// Configuration types
export interface CacheConfig {
  channelData: number;
  videoAnalysis: number;
  aiDetection: number;
}

export interface ApiQuotaCosts {
  channels: number;
  videos: number;
  search: number;
  playlists: number;
}

// Error types
export interface ChannelContextError extends Error {
  code: 'QUOTA_EXCEEDED' | 'API_ERROR' | 'CACHE_ERROR' | 'VALIDATION_ERROR';
  details?: Record<string, any>;
} 
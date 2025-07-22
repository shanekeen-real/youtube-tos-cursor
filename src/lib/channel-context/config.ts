import { CacheConfig, ApiQuotaCosts } from './types';

// Cache configuration
export const CACHE_CONFIG: CacheConfig = {
  channelData: 24 * 60 * 60 * 1000, // 24 hours
  videoAnalysis: 7 * 24 * 60 * 60 * 1000, // 7 days
  aiDetection: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// YouTube API quota costs
export const API_QUOTA_COSTS: ApiQuotaCosts = {
  channels: 1,
  videos: 1,
  search: 100,
  playlists: 1,
};

// AI detection thresholds
export const AI_DETECTION_THRESHOLDS = {
  // Conservative scoring - only flag obvious AI patterns
  uploadConsistency: 0.9, // Perfect consistency threshold
  titleVariation: 0.2, // Very low variation threshold
  subToVideoRatio: 5000, // Extremely high ratio threshold
  viewToSubRatio: 0.05, // Very low engagement threshold
  videosPerDay: 5, // Extremely high frequency threshold
  descriptionTemplates: 5, // Excessive templates threshold
  
  // Bonus deductions for established channels
  establishedChannelAge: 2, // Years
  largeChannelSubscribers: 50000,
  highVideoCount: 100,
  
  // Deduction amounts
  establishedChannelDeduction: 10,
  largeChannelDeduction: 15,
  highVideoCountDeduction: 10,
};

// Pattern analysis thresholds
export const PATTERN_THRESHOLDS = {
  titlePatternMatch: 0.3, // 30% of titles must match pattern
  descriptionTemplateMatch: 0.5, // 50% of descriptions must match template
  uploadSchedulePreference: 0.2, // 20% of uploads must be on same day/time
};

// Confidence calculation weights
export const CONFIDENCE_WEIGHTS = {
  baseConfidence: 50,
  videoCountBonus: 20,
  subscriberBonus: 15,
  patternBonus: 15,
  videoCountThreshold: 10,
  subscriberThreshold: 1000,
}; 
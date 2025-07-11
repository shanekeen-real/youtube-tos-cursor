import { adminDb } from './firebase-admin';
import { usageTracker } from './usage-tracker';

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

// Cache configuration
const CACHE_CONFIG = {
  channelData: 24 * 60 * 60 * 1000, // 24 hours
  videoAnalysis: 7 * 24 * 60 * 60 * 1000, // 7 days
  aiDetection: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// YouTube API quota costs
const API_QUOTA_COSTS = {
  channels: 1,
  videos: 1,
  search: 100,
  playlists: 1,
};

/**
 * Get channel context with smart caching
 */
export async function getChannelContext(channelId: string, accessToken: string): Promise<ChannelContext | null> {
  try {
    // Check cache first
    const cached = await getCachedChannelContext(channelId);
    if (cached && !isExpired(cached.lastUpdated, CACHE_CONFIG.channelData)) {
      console.log(`Using cached channel context for ${channelId}`);
      return cached;
    }

    // Check API quota
    const quotaCheck = await usageTracker.checkQuota('youtube');
    if (!quotaCheck.available) {
      console.warn('YouTube API quota exceeded, using cached data if available');
      return cached;
    }

    // Collect fresh data
    const channelData = await collectChannelData(channelId, accessToken);
    if (!channelData) return null;

    // Calculate AI indicators
    const aiIndicators = calculateAIIndicators(channelData);

    const context: ChannelContext = {
      channelData,
      aiIndicators,
      lastUpdated: new Date().toISOString(),
      cacheKey: `channel_${channelId}`,
    };

    // Cache the result
    await cacheChannelContext(channelId, context);

    return context;
  } catch (error) {
    console.error('Error getting channel context:', error);
    return null;
  }
}

/**
 * Collect legal channel data via YouTube API
 */
async function collectChannelData(channelId: string, accessToken: string): Promise<LegalChannelData | null> {
  try {
    // Basic channel data (1 API call)
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!channelResponse.ok) {
      console.error('Failed to fetch channel data:', channelResponse.status);
      return null;
    }

    const channelData = await channelResponse.json();
    if (!channelData.items || channelData.items.length === 0) {
      return null;
    }

    const channel = channelData.items[0];
    const snippet = channel.snippet;
    const statistics = channel.statistics;

    // Basic legal data
    const basicData: LegalChannelData = {
      channelId: channel.id,
      title: snippet.title,
      description: snippet.description,
      verified: snippet.verified || false,
      category: snippet.categoryId || 'unknown',
      accountDate: snippet.publishedAt,
      subscriberCount: parseInt(statistics.subscriberCount) || 0,
      videoCount: parseInt(statistics.videoCount) || 0,
      viewCount: parseInt(statistics.viewCount) || 0,
    };

    // Enhanced data (additional API calls if quota allows)
    const enhancedData = await collectEnhancedData(channelId, accessToken);
    
    return { ...basicData, ...enhancedData };
  } catch (error) {
    console.error('Error collecting channel data:', error);
    return null;
  }
}

/**
 * Collect enhanced channel data (video patterns, etc.)
 */
async function collectEnhancedData(channelId: string, accessToken: string): Promise<Partial<LegalChannelData>> {
  try {
    // Check if we have quota for additional calls
    const quotaCheck = await usageTracker.checkQuota('youtube');
    if ((quotaCheck.limit - quotaCheck.current) < 3) {
      console.log('Limited quota, skipping enhanced data collection');
      return {};
    }

    // Get recent videos (1 API call)
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=date&maxResults=20`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!videosResponse.ok) {
      return {};
    }

    const videosData = await videosResponse.json();
    const videos = videosData.items || [];

    // Analyze video patterns
    const titlePatterns = analyzeTitlePatterns(videos);
    const descriptionTemplates = analyzeDescriptionTemplates(videos);
    const uploadSchedule = analyzeUploadSchedule(videos);
    const averageVideoLength = calculateAverageVideoLength(videos);

    return {
      titlePatterns,
      descriptionTemplates,
      uploadSchedule,
      averageVideoLength,
      uploadFrequency: calculateUploadFrequency(videos),
    };
  } catch (error) {
    console.error('Error collecting enhanced data:', error);
    return {};
  }
}

/**
 * Calculate AI detection indicators
 */
function calculateAIIndicators(channelData: LegalChannelData): AIDetectionIndicators {
  const channelAge = calculateChannelAge(channelData.accountDate);
  const videosPerDay = channelData.videoCount / Math.max(channelAge, 1);
  const subToVideoRatio = channelData.subscriberCount / Math.max(channelData.videoCount, 1);
  const viewToSubRatio = channelData.viewCount / Math.max(channelData.subscriberCount, 1);

  // Upload consistency (perfect timing = AI indicator, but be more lenient)
  const uploadConsistency = channelData.uploadSchedule?.averageDaysBetween 
    ? calculateConsistencyScore(channelData.uploadSchedule.averageDaysBetween)
    : 0.5;

  // Title variation (repetitive = AI indicator, but allow for branding)
  const titleVariation = channelData.titlePatterns 
    ? calculateVariationScore(channelData.titlePatterns)
    : 0.5;

  // Description templates (template usage = AI indicator)
  const descriptionTemplates = channelData.descriptionTemplates?.length || 0;

  // Calculate overall AI probability with more conservative thresholds
  let aiScore = 0;
  
  // More conservative scoring - only flag obvious AI patterns
  if (uploadConsistency > 0.9) aiScore += 15; // Was 20, now 15 - only perfect consistency
  if (titleVariation < 0.2) aiScore += 10; // Was 15, now 10 - only very low variation
  if (subToVideoRatio > 5000) aiScore += 5; // Was 10, now 5 - only extremely high ratios
  if (viewToSubRatio < 0.05) aiScore += 10; // Was 15, now 10 - only very low engagement
  if (videosPerDay > 5) aiScore += 15; // Was 20, now 15 - only extremely high frequency
  if (descriptionTemplates > 5) aiScore += 5; // Was 10, now 5 - only excessive templates

  // Bonus deductions for established channels
  if (channelAge > 2) aiScore = Math.max(0, aiScore - 10); // Established channels get 10-point deduction
  if (channelData.subscriberCount > 50000) aiScore = Math.max(0, aiScore - 15); // Large channels get 15-point deduction
  if (channelData.videoCount > 100) aiScore = Math.max(0, aiScore - 10); // High video count gets 10-point deduction

  const aiProbability = Math.min(aiScore, 100);
  const confidence = calculateConfidence(channelData);

  return {
    uploadConsistency,
    titleVariation,
    descriptionTemplates,
    subToVideoRatio,
    viewToSubRatio,
    videosPerDay,
    aiProbability,
    confidence,
  };
}

/**
 * Cache management functions
 */
async function getCachedChannelContext(channelId: string): Promise<ChannelContext | null> {
  try {
    const cacheRef = adminDb.collection('channel_context_cache').doc(channelId);
    const doc = await cacheRef.get();
    
    if (doc.exists) {
      return doc.data() as ChannelContext;
    }
    return null;
  } catch (error) {
    console.error('Error getting cached channel context:', error);
    return null;
  }
}

async function cacheChannelContext(channelId: string, context: ChannelContext): Promise<void> {
  try {
    const cacheRef = adminDb.collection('channel_context_cache').doc(channelId);
    await cacheRef.set(context);
  } catch (error) {
    console.error('Error caching channel context:', error);
  }
}

function isExpired(timestamp: string, ttl: number): boolean {
  const age = Date.now() - new Date(timestamp).getTime();
  return age > ttl;
}

/**
 * Utility functions for pattern analysis
 */
function analyzeTitlePatterns(videos: any[]): string[] {
  const titles = videos.map(v => v.snippet.title);
  const patterns: string[] = [];
  
  // Look for common patterns
  const commonPatterns = [
    /^[A-Z\s]+$/, // ALL CAPS
    /^\d+\.\s/, // Numbered lists
    /^How to/i, // How-to videos
    /^The Truth About/i, // Truth videos
    /^You Won't Believe/i, // Clickbait
  ];
  
  commonPatterns.forEach(pattern => {
    const matches = titles.filter(title => pattern.test(title));
    if (matches.length > titles.length * 0.3) {
      patterns.push(pattern.source);
    }
  });
  
  return patterns;
}

function analyzeDescriptionTemplates(videos: any[]): string[] {
  const descriptions = videos.map(v => v.snippet.description);
  const templates: string[] = [];
  
  // Look for template patterns
  const templatePatterns = [
    /Subscribe to our channel/i,
    /Follow us on social media/i,
    /Like and share this video/i,
    /Comment below/i,
  ];
  
  templatePatterns.forEach(pattern => {
    const matches = descriptions.filter(desc => pattern.test(desc));
    if (matches.length > descriptions.length * 0.5) {
      templates.push(pattern.source);
    }
  });
  
  return templates;
}

function analyzeUploadSchedule(videos: any[]): { averageDaysBetween: number; preferredDays: string[]; preferredTimes: string[] } {
  if (videos.length < 2) {
    return { averageDaysBetween: 0, preferredDays: [], preferredTimes: [] };
  }
  
  const dates = videos.map(v => new Date(v.snippet.publishedAt)).sort((a, b) => b.getTime() - a.getTime());
  const intervals: number[] = [];
  
  for (let i = 0; i < dates.length - 1; i++) {
    const interval = (dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(interval);
  }
  
  const averageDaysBetween = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  
  // Analyze preferred days and times (simplified)
  const days = dates.map(d => d.toLocaleDateString('en-US', { weekday: 'long' }));
  const times = dates.map(d => d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }));
  
  const dayCounts = days.reduce((acc, day) => {
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const timeCounts = times.reduce((acc, time) => {
    acc[time] = (acc[time] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const preferredDays = Object.entries(dayCounts)
    .filter(([_, count]) => count > dates.length * 0.2)
    .map(([day]) => day);
  
  const preferredTimes = Object.entries(timeCounts)
    .filter(([_, count]) => count > dates.length * 0.2)
    .map(([time]) => time);
  
  return { averageDaysBetween, preferredDays, preferredTimes };
}

function calculateAverageVideoLength(videos: any[]): number {
  // This would require additional API calls to get video duration
  // For now, return a placeholder
  return 0;
}

function calculateUploadFrequency(videos: any[]): number {
  if (videos.length < 2) return 0;
  
  const firstDate = new Date(videos[videos.length - 1].snippet.publishedAt);
  const lastDate = new Date(videos[0].snippet.publishedAt);
  const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return videos.length / Math.max(daysDiff, 1);
}

function calculateChannelAge(publishedAt: string): number {
  const published = new Date(publishedAt);
  const now = new Date();
  return (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
}

function calculateConsistencyScore(averageDaysBetween: number): number {
  // Perfect consistency (same interval) = 1.0
  // High variation = 0.0
  // This is a simplified calculation
  return Math.min(averageDaysBetween / 7, 1.0);
}

function calculateVariationScore(patterns: string[]): number {
  // More patterns = more variation = higher score
  return Math.min(patterns.length / 5, 1.0);
}

function calculateConfidence(channelData: LegalChannelData): number {
  // Higher confidence with more data points
  let confidence = 50; // Base confidence
  
  if (channelData.videoCount > 10) confidence += 20;
  if (channelData.subscriberCount > 1000) confidence += 15;
  if (channelData.titlePatterns && channelData.titlePatterns.length > 0) confidence += 15;
  
  return Math.min(confidence, 100);
} 
import { usageTracker } from '../usage-tracker';
import { ChannelContext } from './types';
import { CACHE_CONFIG } from './config';
import { collectChannelData } from './youtube-api';
import { calculateAIIndicators } from './ai-detection';
import { 
  getCachedChannelContext, 
  cacheChannelContext, 
  isChannelContextValid 
} from './cache';

/**
 * Get channel context with smart caching and quota management
 */
export async function getChannelContext(channelId: string, accessToken: string): Promise<ChannelContext | null> {
  try {
    // Check cache first
    const cached = await getCachedChannelContext(channelId);
    if (cached && isChannelContextValid(cached)) {
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

// Re-export types for external use
export type { 
  ChannelContext, 
  LegalChannelData, 
  AIDetectionIndicators,
  YouTubeVideoItem,
  YouTubeVideoSnippet 
} from './types'; 
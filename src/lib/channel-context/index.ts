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
import { adminDb } from '@/lib/firebase-admin';

/**
 * Get channel context with smart caching and quota management
 * Supports both cached retrieval (userId only) and fresh API fetching (userId + accessToken)
 */
export async function getChannelContext(userId: string, accessToken?: string): Promise<ChannelContext | null> {
  try {
    // If accessToken is provided, fetch fresh data from YouTube API
    if (accessToken) {
      console.log('Fetching fresh channel context from YouTube API for channel:', userId);
      
      // Collect channel data from YouTube API
      const channelData = await collectChannelData(userId, accessToken);
      if (!channelData) {
        console.warn('Failed to collect channel data from YouTube API');
        return null;
      }

      // Calculate AI indicators using the collected channel data
      const aiIndicators = calculateAIIndicators(channelData);
      
      // Create channel context
      const channelContext: ChannelContext = {
        channelData,
        aiIndicators,
        lastUpdated: new Date().toISOString(),
        cacheKey: `channel_${userId}`
      };

      // Cache the result for future use
      try {
        await cacheChannelContext(userId, channelContext);
      } catch (cacheError) {
        console.warn('Failed to cache channel context:', cacheError);
        // Continue without caching - this is not critical
      }

      return channelContext;
    } else {
      // Fallback to cached retrieval from Firestore
      console.log('Retrieving cached channel context from Firestore for user:', userId);
      
      const userDoc = await adminDb.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = userDoc.data();
      return userData?.channelContext || null;
    }
  } catch (error: any) {
    // Handle Firebase quota exhaustion gracefully
    if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
      console.warn('Firebase quota exceeded for channel context, returning null');
      return null;
    } else {
      console.error('Error getting channel context:', error);
      return null;
    }
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
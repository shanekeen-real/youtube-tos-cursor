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
 */
export async function getChannelContext(userId: string): Promise<ChannelContext | null> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData?.channelContext || null;
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
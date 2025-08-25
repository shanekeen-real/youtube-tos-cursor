import { adminDb } from '@/lib/firebase-admin';
import { ChannelContext } from './types';
import { CACHE_CONFIG } from './config';
import { isExpired } from './utils';

/**
 * Get cached channel context from Firestore
 */
export async function getCachedChannelContext(channelId: string): Promise<ChannelContext | null> {
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

/**
 * Cache channel context in Firestore
 */
export async function cacheChannelContext(channelId: string, context: ChannelContext): Promise<void> {
  try {
    const cacheRef = adminDb.collection('channel_context_cache').doc(channelId);
    await cacheRef.set(context);
  } catch (error) {
    console.error('Error caching channel context:', error);
  }
}

/**
 * Check if cached channel context is still valid
 */
export function isChannelContextValid(cached: ChannelContext): boolean {
  return !isExpired(cached.lastUpdated, CACHE_CONFIG.channelData);
}

/**
 * Clear expired cache entries (utility function for maintenance)
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    const cacheRef = adminDb.collection('channel_context_cache');
    const snapshot = await cacheRef.get();
    
    const expiredDocs: string[] = [];
    snapshot.docs.forEach((doc: any) => {
      const data = doc.data() as ChannelContext;
      if (!isChannelContextValid(data)) {
        expiredDocs.push(doc.id);
      }
    });
    
    // Delete expired entries in batches
    const batch = adminDb.batch();
    expiredDocs.forEach(docId => {
      const docRef = cacheRef.doc(docId);
      batch.delete(docRef);
    });
    
    if (expiredDocs.length > 0) {
      await batch.commit();
      console.log(`Cleared ${expiredDocs.length} expired cache entries`);
    }
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
} 
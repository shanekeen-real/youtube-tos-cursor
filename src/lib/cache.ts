import { adminDb } from '@/lib/firebase-admin';
import Redis from 'ioredis';

// Cache configuration
const CACHE_TTL = {
  NOTIFICATIONS: 30, // 30 seconds
  USER_SCANS: 60,    // 1 minute
  SCAN_DETAILS: 300, // 5 minutes
  USER_PROFILE: 600  // 10 minutes
};

// In-memory cache for development
const memoryCache = new Map<string, { data: any; expires: number }>();

// Redis client for production
let redis: Redis | null = null;

// Initialize Redis in production
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000,
    commandTimeout: 5000
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });
}

// Cache key generators
export const cacheKeys = {
  notifications: (userId: string, unreadOnly: boolean, limit: number) => 
    `notifications:${userId}:${unreadOnly}:${limit}`,
  userScans: (userId: string, status: string, limit: number, offset: number) => 
    `user_scans:${userId}:${status}:${limit}:${offset}`,
  scanDetails: (scanId: string) => `scan_details:${scanId}`,
  userProfile: (userId: string) => `user_profile:${userId}`,
  unreadCounts: (userId: string) => `unread_counts:${userId}`
};

// Cache operations
export class CacheManager {
  private static instance: CacheManager;
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first
      const cached = memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.data as T;
      }
      
      // Remove expired entry
      if (cached) {
        memoryCache.delete(key);
      }

      // In production, check Redis
      if (redis && process.env.NODE_ENV === 'production') {
        try {
          const redisData = await redis.get(key);
          if (redisData) {
            const parsed = JSON.parse(redisData);
            // Add to memory cache for 5 seconds
            memoryCache.set(key, { data: parsed, expires: Date.now() + 5000 });
            return parsed;
          }
        } catch (redisError) {
          console.warn('Redis get error:', redisError);
        }
      }

      return null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, ttlSeconds: number = 60): Promise<void> {
    try {
      const expires = Date.now() + (ttlSeconds * 1000);
      
      // Set memory cache
      memoryCache.set(key, { data, expires });
      
      // In production, set Redis
      if (redis && process.env.NODE_ENV === 'production') {
        try {
          await redis.setex(key, ttlSeconds, JSON.stringify(data));
        } catch (redisError) {
          console.warn('Redis set error:', redisError);
        }
      }
      
      // Clean up expired entries periodically
      if (memoryCache.size > 1000) {
        this.cleanup();
      }
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Clear memory cache entries matching pattern
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern)) {
          memoryCache.delete(key);
        }
      }
      
      // In production, clear Redis keys
      if (redis && process.env.NODE_ENV === 'production') {
        try {
          const keys = await redis.keys(`*${pattern}*`);
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } catch (redisError) {
          console.warn('Redis invalidate error:', redisError);
        }
      }
    } catch (error) {
      console.warn('Cache invalidate error:', error);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (value.expires < now) {
        memoryCache.delete(key);
      }
    }
  }
}

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(
  key: string, 
  requestFn: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = requestFn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Cache middleware for API routes
export function withCache<T>(
  cacheKey: string,
  ttlSeconds: number,
  dataFn: () => Promise<T>
): Promise<T> {
  return deduplicateRequest(cacheKey, async () => {
    const cache = CacheManager.getInstance();
    
    // Try cache first
    const cached = await cache.get<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }
    
    // Fetch fresh data
    const data = await dataFn();
    
    // Cache the result
    await cache.set(cacheKey, data, ttlSeconds);
    
    return data;
  });
}

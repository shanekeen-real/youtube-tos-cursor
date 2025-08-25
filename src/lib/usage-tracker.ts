// Conditional import for server-side only
import type { Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | null = null;
if (typeof window === 'undefined') {
  try {
    const { adminDb: db } = require('./firebase-admin');
    adminDb = db;
  } catch (error) {
    console.error("Failed to import adminDb:", error);
  }
}

// Simple usage tracker for API calls
interface UsageStats {
  date: string;
  gemini_calls: number;
  claude_calls: number;
  total_calls: number;
}

interface UsageData {
  date: string;
  gemini: number;
  claude: number;
  youtube: number;
  lastReset: string;
}

class UsageTracker {
  private static instance: UsageTracker;
  private usage: Map<string, UsageData> = new Map();
  private readonly DAILY_LIMITS = {
    gemini: 50,
    claude: 100,
    youtube: 10000 // YouTube API quota units per day
  };

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  constructor() {
    // Only load usage if we're on the server side and adminDb is available
    if (typeof window === 'undefined' && adminDb) {
      this.loadUsage();
    }
  }

  private async loadUsage(): Promise<void> {
    try {
      if (!adminDb) {
        console.warn('adminDb not available, using default values');
        const today = new Date().toISOString().split('T')[0];
        this.usage.set(today, {
          date: today,
          gemini: 0,
          claude: 0,
          youtube: 0,
          lastReset: new Date().toISOString()
        });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const usageRef = adminDb.collection('usage_tracking').doc(today);
      const doc = await usageRef.get();

      if (doc.exists) {
        const data = doc.data() as UsageData;
        this.usage.set(today, data);
      } else {
        // Initialize with default values if no data exists
        this.usage.set(today, {
          date: today,
          gemini: 0,
          claude: 0,
          youtube: 0,
          lastReset: new Date().toISOString()
        });
      }
    } catch (error: any) {
      // Handle Firebase quota exhaustion gracefully
      if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded')) {
        console.warn('Firebase quota exceeded for usage tracking, using default values');
        const today = new Date().toISOString().split('T')[0];
        this.usage.set(today, {
          date: today,
          gemini: 0,
          claude: 0,
          youtube: 0,
          lastReset: new Date().toISOString()
        });
      } else {
        console.error('Error loading usage data:', error);
        // Still provide default values to prevent app crashes
        const today = new Date().toISOString().split('T')[0];
        this.usage.set(today, {
          date: today,
          gemini: 0,
          claude: 0,
          youtube: 0,
          lastReset: new Date().toISOString()
        });
      }
    }
  }

  private async saveUsage(date: string, data: UsageData) {
    try {
      if (!adminDb) {
        console.warn('adminDb not available, skipping usage saving');
        return;
      }
      
      const usageRef = adminDb.collection('usage_tracking').doc(date);
      await usageRef.set(data);
    } catch (error) {
      console.error('Error saving usage data:', error);
    }
  }

  async trackUsage(service: 'gemini' | 'claude' | 'youtube', units: number = 1): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    // Load current usage if not in memory and adminDb is available
    if (!this.usage.has(today) && adminDb) {
      await this.loadUsage();
    }
    
    const currentUsage = this.usage.get(today) || {
      date: today,
      gemini: 0,
      claude: 0,
      youtube: 0,
      lastReset: new Date().toISOString()
    };

    // Check if we've exceeded the limit
    const newTotal = currentUsage[service] + units;
    if (newTotal > this.DAILY_LIMITS[service]) {
      console.warn(`${service.toUpperCase()} daily limit exceeded: ${newTotal}/${this.DAILY_LIMITS[service]}`);
      return false;
    }

    // Update usage
    currentUsage[service] = newTotal;
    this.usage.set(today, currentUsage);
    
    // Save to database if adminDb is available
    if (adminDb) {
      await this.saveUsage(today, currentUsage);
    }
    
    console.log(`${service.toUpperCase()} usage tracked: ${newTotal}/${this.DAILY_LIMITS[service]}`);
    return true;
  }

  async checkQuota(service: 'gemini' | 'claude' | 'youtube'): Promise<{ available: boolean; current: number; limit: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.usage.has(today) && adminDb) {
      await this.loadUsage();
    }
    
    const currentUsage = this.usage.get(today) || {
      date: today,
      gemini: 0,
      claude: 0,
      youtube: 0,
      lastReset: new Date().toISOString()
    };

    return {
      available: currentUsage[service] < this.DAILY_LIMITS[service],
      current: currentUsage[service],
      limit: this.DAILY_LIMITS[service]
    };
  }

  getUsageSummary() {
    const today = new Date().toISOString().split('T')[0];
    const currentUsage = this.usage.get(today) || {
      date: today,
      gemini: 0,
      claude: 0,
      youtube: 0,
      lastReset: new Date().toISOString()
    };

    return {
      date: today,
      gemini: {
        used: currentUsage.gemini,
        limit: this.DAILY_LIMITS.gemini,
        remaining: this.DAILY_LIMITS.gemini - currentUsage.gemini
      },
      claude: {
        used: currentUsage.claude,
        limit: this.DAILY_LIMITS.claude,
        remaining: this.DAILY_LIMITS.claude - currentUsage.claude
      },
      youtube: {
        used: currentUsage.youtube,
        limit: this.DAILY_LIMITS.youtube,
        remaining: this.DAILY_LIMITS.youtube - currentUsage.youtube
      }
    };
  }

  reset(): void {
    this.usage.clear();
  }

  // Synchronous, lightweight usage increment (does not persist to DB)
  recordCall(service: 'gemini' | 'claude' | 'youtube') {
    const today = new Date().toISOString().split('T')[0];
    if (!this.usage.has(today)) {
      this.usage.set(today, {
        date: today,
        gemini: 0,
        claude: 0,
        youtube: 0,
        lastReset: new Date().toISOString()
      });
    }
    const usage = this.usage.get(today)!;
    usage[service]++;
    this.usage.set(today, usage);
  }
}

export const usageTracker = UsageTracker.getInstance(); 
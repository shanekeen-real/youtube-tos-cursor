import { adminDb } from './firebase-admin';

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
    this.loadUsage();
  }

  private async loadUsage() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const usageRef = adminDb.collection('usage_tracking').doc(today);
      const doc = await usageRef.get();
      
      if (doc.exists) {
        const data = doc.data() as UsageData;
        this.usage.set(today, data);
      } else {
        // Initialize today's usage
        this.usage.set(today, {
          date: today,
          gemini: 0,
          claude: 0,
          youtube: 0,
          lastReset: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  }

  private async saveUsage(date: string, data: UsageData) {
    try {
      const usageRef = adminDb.collection('usage_tracking').doc(date);
      await usageRef.set(data);
    } catch (error) {
      console.error('Error saving usage data:', error);
    }
  }

  async trackUsage(service: 'gemini' | 'claude' | 'youtube', units: number = 1): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    // Load current usage if not in memory
    if (!this.usage.has(today)) {
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
    
    // Save to database
    await this.saveUsage(today, currentUsage);
    
    console.log(`${service.toUpperCase()} usage tracked: ${newTotal}/${this.DAILY_LIMITS[service]}`);
    return true;
  }

  async checkQuota(service: 'gemini' | 'claude' | 'youtube'): Promise<{ available: boolean; current: number; limit: number }> {
    const today = new Date().toISOString().split('T')[0];
    
    if (!this.usage.has(today)) {
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
}

export const usageTracker = UsageTracker.getInstance(); 
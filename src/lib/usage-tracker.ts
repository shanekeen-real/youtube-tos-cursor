// Simple usage tracker for API calls
interface UsageStats {
  date: string;
  gemini_calls: number;
  claude_calls: number;
  total_calls: number;
}

class UsageTracker {
  private static instance: UsageTracker;
  private usage: Map<string, UsageStats> = new Map();

  static getInstance(): UsageTracker {
    if (!UsageTracker.instance) {
      UsageTracker.instance = new UsageTracker();
    }
    return UsageTracker.instance;
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  recordCall(model: 'gemini' | 'claude'): void {
    const today = this.getTodayKey();
    const current = this.usage.get(today) || {
      date: today,
      gemini_calls: 0,
      claude_calls: 0,
      total_calls: 0
    };

    if (model === 'gemini') {
      current.gemini_calls++;
    } else {
      current.claude_calls++;
    }
    current.total_calls++;

    this.usage.set(today, current);
    
    // Log usage for monitoring
    console.log(`API Usage - ${today}: Gemini: ${current.gemini_calls}/50, Claude: ${current.claude_calls}`);
    
    // Warn when approaching limits
    if (current.gemini_calls >= 45) {
      console.warn(`⚠️ WARNING: Approaching Gemini daily limit (${current.gemini_calls}/50)`);
    }
  }

  getTodayUsage(): UsageStats | null {
    const today = this.getTodayKey();
    return this.usage.get(today) || null;
  }

  getUsageSummary(): {
    today: UsageStats | null;
    gemini_remaining: number;
    claude_remaining: number;
    recommendations: string[];
  } {
    const today = this.getTodayUsage();
    const geminiRemaining = today ? Math.max(0, 50 - today.gemini_calls) : 50;
    const claudeRemaining = today ? Math.max(0, 5000000 - today.claude_calls) : 5000000; // 5M token limit

    const recommendations = [];
    if (geminiRemaining <= 5) {
      recommendations.push('Switch to Claude 3 Haiku for higher limits');
    }
    if (geminiRemaining <= 10) {
      recommendations.push('Consider reducing API calls or wait for quota reset');
    }

    return {
      today,
      gemini_remaining: geminiRemaining,
      claude_remaining: claudeRemaining,
      recommendations
    };
  }

  reset(): void {
    this.usage.clear();
  }
}

export const usageTracker = UsageTracker.getInstance(); 
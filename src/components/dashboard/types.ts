// Dashboard-specific TypeScript interfaces

export interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
}

export interface VideoRiskLevel {
  riskLevel: string;
  riskScore: number;
}

export interface VideoRiskLevels {
  [videoId: string]: VideoRiskLevel | null;
}

export interface RevenueData {
  atRisk: number;
  secured: number;
  total: number;
  details: {
    videoId: string;
    title: string;
    earnings: number;
    riskLevel: string;
    cpm?: number;
    rpm?: number;
    monetizedPercent?: number;
    includeCut?: boolean;
    viewCount: number;
    timestamp: string;
  }[];
  setupRequired?: boolean;
}

export interface YouTubeChannel {
  snippet: {
    title: string;
    description: string;
  };
  statistics: {
    subscriberCount: string;
    viewCount: string;
    videoCount: string;
  };
}

export interface ChannelContext {
  channelData: {
    title: string;
    description: string;
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    accountDate?: string;
  };
  aiIndicators: {
    aiProbability: number;
    confidence: number;
  };
}

export interface Video {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

export interface SelectedVideoForReports {
  id: string;
  title: string;
} 
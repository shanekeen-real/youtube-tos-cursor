import { LegalChannelData, YouTubeVideoItem } from './types';
import { 
  analyzeTitlePatterns, 
  analyzeDescriptionTemplates, 
  analyzeUploadSchedule, 
  calculateAverageVideoLength, 
  calculateUploadFrequency 
} from './utils';

/**
 * Collect legal channel data via YouTube API
 */
export async function collectChannelData(channelId: string, accessToken: string): Promise<LegalChannelData | null> {
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
    const videos: YouTubeVideoItem[] = videosData.items || [];

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
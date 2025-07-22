import { adminDb } from '@/lib/firebase-admin';
import { usageTracker } from '@/lib/usage-tracker';
import { YouTubeVideo, YouTubeVideoStats, VideoStats } from '../../app/api/revenue-at-risk/route';

export async function getCachedYouTubeData(channelId: string) {
  const cacheKey = `videos_${channelId}`;
  const cacheRef = adminDb.collection('youtube_cache').doc(cacheKey);
  const cacheDoc = await cacheRef.get();
  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data();
    if (cacheData) {
      const cacheAge = Date.now() - cacheData.timestamp.toMillis();
      const cacheAgeHours = cacheAge / (1000 * 60 * 60);
      if (cacheAgeHours < 24) {
        // Ensure correct type for viewCounts
        const rawViewCounts = cacheData.viewCounts || {};
        const viewCounts = new Map<string, VideoStats>(
          Object.entries(rawViewCounts).map(([k, v]) => [k, v as VideoStats])
        );
        return {
          videos: cacheData.videos || [],
          viewCounts,
        };
      }
    }
  }
  return null;
}

export async function fetchAndCacheYouTubeData({ channelId, accessToken }: { channelId: string; accessToken: string; }) {
  let allVideos: YouTubeVideo[] = [];
  let viewCounts = new Map<string, VideoStats>();

  // Check quota before making expensive API calls
  const quotaCheck = await usageTracker.checkQuota('youtube');
  if (!quotaCheck.available) {
    throw new Error('YouTube API quota exceeded for today. Revenue calculation will be available tomorrow.');
  }
  const estimatedCost = 10;
  if (quotaCheck.current + estimatedCost > quotaCheck.limit) {
    throw new Error('Insufficient YouTube API quota for revenue calculation. Please try again later.');
  }

  let nextPageToken = '';
  do {
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&maxResults=50&order=date${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch videos from YouTube');
    }
    const data = await response.json();
    allVideos = allVideos.concat(data.items || []);
    nextPageToken = data.nextPageToken;
    await usageTracker.trackUsage('youtube', 1);
  } while (nextPageToken && allVideos.length < 200);

  // Get view counts for all videos
  const videoIds = allVideos.map((v: YouTubeVideo) => v.id.videoId).filter(Boolean);
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${chunk.join(',')}`;
    const statsResponse = await fetch(statsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      statsData.items?.forEach((item: YouTubeVideoStats) => {
        viewCounts.set(item.id, {
          viewCount: parseInt(item.statistics?.viewCount || '0'),
          title: item.snippet?.title || 'Untitled',
        });
      });
      await usageTracker.trackUsage('youtube', 1);
    }
  }

  // Cache the results for 24 hours
  const cacheKey = `videos_${channelId}`;
  const cacheRef = adminDb.collection('youtube_cache').doc(cacheKey);
  await cacheRef.set({
    videos: allVideos,
    viewCounts: Object.fromEntries(viewCounts),
    timestamp: new Date(),
    channelId: channelId
  });

  return {
    videos: allVideos,
    viewCounts,
  };
} 
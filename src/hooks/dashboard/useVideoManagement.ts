import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { Video, VideoRiskLevels, YouTubeChannel } from '@/components/dashboard/types';

export function useVideoManagement(session: Session | null, ytChannel: YouTubeChannel | null) {
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videoRiskLevels, setVideoRiskLevels] = useState<VideoRiskLevels>({});
  const [videosLastFetched, setVideosLastFetched] = useState<number>(0);

  // Fetch risk levels for videos
  const fetchRiskLevels = async (videos: Video[]) => {
    try {
      const videoIds = videos.map(video => video.id.videoId || video.id);
      const response = await fetch('/api/get-risk-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideoRiskLevels(data.riskLevels || {});
      } else {
        console.warn('Failed to fetch risk levels');
      }
    } catch (err) {
      console.error('Error fetching risk levels:', err);
    }
  };

  // Fetch recent 5 videos after YouTube channel is connected
  useEffect(() => {
    const fetchRecentVideos = async () => {
      if (!ytChannel || !session?.user?.id) return;
      // Only fetch if more than 5 minutes have passed since last fetch
      if (Date.now() - videosLastFetched < 5 * 60 * 1000) return;
      setVideosLoading(true);
      setVideosError(null);
      try {
        console.log('Fetching recent videos for user:', session.user.id);
        const response = await fetch('/api/fetch-youtube-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageSize: 5 }),
        });
        setVideosLastFetched(Date.now());
        
        console.log('Videos API response status:', response.status);
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error('Videos API error:', errorData);
          const errorMessage = errorData.error || errorData.details || `Failed to fetch videos (${response.status})`;
          setVideosError(errorMessage);
          setRecentVideos([]);
        } else {
          const data = await response.json();
          console.log('Successfully fetched videos:', data.items?.length || 0);
          setRecentVideos(data.items || []);
          
          // Fetch risk levels for these videos
          if (data.items && data.items.length > 0) {
            await fetchRiskLevels(data.items);
          }
        }
      } catch (err: any) {
        console.error('Network error fetching videos:', err);
        setVideosError(err.message || 'Network error while fetching videos');
        setRecentVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };

    // Add a small delay when YouTube is connected to ensure proper setup
    if (ytChannel) {
      const timer = setTimeout(() => {
        fetchRecentVideos();
      }, 1500); // 1.5 second delay
      return () => clearTimeout(timer);
    }
  }, [ytChannel, session?.user?.id, videosLastFetched]);

  const handleRefreshVideos = async () => {
    if (!ytChannel || !session?.user?.id) return;
    setVideosLoading(true);
    setVideosError(null);
    try {
      const response = await fetch('/api/fetch-youtube-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageSize: 5 }),
      });
      setVideosLastFetched(Date.now());
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('Videos API error:', errorData);
        const errorMessage = errorData.error || errorData.details || `Failed to fetch videos (${response.status})`;
        setVideosError(errorMessage);
        setRecentVideos([]);
      } else {
        const data = await response.json();
        setRecentVideos(data.items || []);
        if (data.items && data.items.length > 0) {
          await fetchRiskLevels(data.items);
        }
      }
    } catch (err: any) {
      setVideosError(err.message || 'Network error while fetching videos');
      setRecentVideos([]);
    } finally {
      setVideosLoading(false);
    }
  };

  return {
    recentVideos,
    videosLoading,
    videosError,
    videoRiskLevels,
    videosLastFetched,
    fetchRecentVideos: handleRefreshVideos,
    handleRefreshVideos
  };
} 
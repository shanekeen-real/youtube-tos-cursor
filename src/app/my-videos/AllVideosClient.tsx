"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Search, Filter, SortAsc, SortDesc, Calendar, Eye, Clock, Grid, List, ChevronDown } from 'lucide-react';
import { Card } from '@/lib/imports';
import { Button } from '@/lib/imports';
import { useInView } from 'react-intersection-observer';
import * as Sentry from "@sentry/nextjs";
import { VideoReportsModal } from '@/lib/imports';


// Types
interface Video {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
    };
    channelTitle: string;
    tags?: string[];
  };
  statistics?: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
    dislikeCount: string;
  };
  status?: {
    privacyStatus: 'public' | 'unlisted' | 'private';
  };
}

// Type definitions for form controls
type SortByValue = 'date' | 'title' | 'views' | 'likes';
type DateRangeValue = 'all' | 'week' | 'month' | 'year';
type PrivacyValue = 'public' | 'unlisted' | 'private' | 'all';

interface VideoFilters {
  search: string;
  sortBy: 'date' | 'title' | 'views' | 'likes';
  sortOrder: 'asc' | 'desc';
  dateRange: 'all' | 'week' | 'month' | 'year';
  viewType: 'grid' | 'list';
  privacy: 'public' | 'unlisted' | 'private' | 'all';
}

interface PaginationInfo {
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults?: number;
  resultsPerPage: number;
}

export default function AllVideosClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<VideoFilters>({
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
    dateRange: 'all',
    viewType: 'grid',
    privacy: 'public',
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    resultsPerPage: 20
  });
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Refs for intersection observer
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [analyzingVideoId, setAnalyzingVideoId] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [videoRiskLevels, setVideoRiskLevels] = useState<{ [videoId: string]: { riskLevel: string; riskScore: number } | null }>({});
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedVideoForReports, setSelectedVideoForReports] = useState<{ id: string; title: string } | null>(null);

  // Memoized filtered videos
  const filteredVideos = useMemo(() => {
    // Deduplicate videos by videoId first
    const uniqueVideos = videos.filter((video, index, self) => 
      index === self.findIndex(v => v.id.videoId === video.id.videoId)
    );
    let filtered = [...uniqueVideos];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(video => 
        video.snippet.title.toLowerCase().includes(searchLower) ||
        video.snippet.description.toLowerCase().includes(searchLower) ||
        video.snippet.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        all: new Date(0),
      };
      
      filtered = filtered.filter(video => {
        const publishDate = new Date(video.snippet.publishedAt);
        return publishDate >= ranges[filters.dateRange];
      });
    }
    
    // Privacy filter
    if (filters.privacy !== 'all') {
      filtered = filtered.filter(video => video.status?.privacyStatus === filters.privacy);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;
      
      switch (filters.sortBy) {
        case 'title':
          aValue = a.snippet.title.toLowerCase();
          bValue = b.snippet.title.toLowerCase();
          break;
        case 'views':
          aValue = parseInt(a.statistics?.viewCount || '0');
          bValue = parseInt(b.statistics?.viewCount || '0');
          break;
        case 'likes':
          aValue = parseInt(a.statistics?.likeCount || '0');
          bValue = parseInt(b.statistics?.likeCount || '0');
          break;
        case 'date':
        default:
          aValue = new Date(a.snippet.publishedAt);
          bValue = new Date(b.snippet.publishedAt);
          break;
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [videos, filters]);

  // Fetch videos with error handling and retry logic
  const fetchVideos = useCallback(async (pageToken?: string, isLoadMore = false) => {
    return Sentry.startSpan(
      {
        op: "http.client",
        name: "Fetch YouTube Videos",
      },
      async () => {
        try {
          setError(null);
          if (!isLoadMore) {
            setLoading(true);
          } else {
            setIsLoadingMore(true);
          }

          const response = await fetch('/api/fetch-youtube-videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              pageSize: pagination.resultsPerPage,
              pageToken 
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          
          if (isLoadMore) {
            setVideos(prev => {
              // Deduplicate videos by videoId to prevent duplicate keys
              const existingIds = new Set(prev.map((v: Video) => v.id.videoId));
              const newVideos = (data.items || []).filter((v: Video) => !existingIds.has(v.id.videoId));
              return [...prev, ...newVideos];
            });
          } else {
            setVideos(data.items || []);
          }
          
          setPagination(prev => ({
            ...prev,
            nextPageToken: data.nextPageToken,
            prevPageToken: data.prevPageToken,
            totalResults: data.pageInfo?.totalResults
          }));
          
          setHasMore(!!data.nextPageToken);
          
        } catch (err: unknown) {
          console.error('Error fetching videos:', err);
          Sentry.captureException(err);
          setError(err instanceof Error ? err.message : 'Failed to fetch videos');
        } finally {
          setLoading(false);
          setIsLoadingMore(false);
        }
      }
    );
  }, [pagination.resultsPerPage]);

  // Load more videos when user scrolls to bottom
  useEffect(() => {
    if (inView && hasMore && !isLoadingMore && !loading) {
      fetchVideos(pagination.nextPageToken, true);
    }
  }, [inView, hasMore, isLoadingMore, loading, pagination.nextPageToken, fetchVideos]);

  // Fetch risk levels for videos
  const fetchRiskLevels = useCallback(async (videos: Video[]) => {
    try {
      const videoIds = videos.map(video => video.id.videoId);
      const response = await fetch('/api/get-risk-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideoRiskLevels(prev => ({ ...prev, ...data.riskLevels }));
      } else {
        console.warn('Failed to fetch risk levels');
      }
    } catch (err) {
      console.error('Error fetching risk levels:', err);
    }
  }, []);

  // Get risk badge color
  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Get risk badge text
  const getRiskBadgeText = (videoId: string) => {
    const riskData = videoRiskLevels[videoId];
    if (!riskData) {
      return 'NO RISK SCORE';
    }
    return `${riskData.riskLevel} RISK`;
  };

  // Initial load
  useEffect(() => {
    if (session?.user?.id) {
      fetchVideos();
    }
  }, [session?.user?.id, fetchVideos]);

  // Fetch risk levels when videos change
  useEffect(() => {
    if (videos.length > 0) {
      fetchRiskLevels(videos);
    }
  }, [videos, fetchRiskLevels]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Handle video analysis
  const handleAnalyzeVideo = useCallback(async (videoId: string) => {
    setAnalyzeError(null);
    setAnalyzingVideoId(videoId);
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze video');
      }
      const data = await response.json();
      if (data.scanId) {
        router.push(`/results?scanId=${data.scanId}`);
      } else {
        router.push(`/results?videoId=${videoId}`);
      }
    } catch (err: unknown) {
      setAnalyzeError(err instanceof Error ? err.message : 'Failed to analyze video');
    } finally {
      setAnalyzingVideoId(null);
    }
  }, [router]);

  // Format view count
  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Handle viewing reports for a video
  const handleViewReports = (videoId: string, videoTitle: string) => {
    setSelectedVideoForReports({ id: videoId, title: videoTitle });
    setReportsModalOpen(true);
  };

  // Loading states
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your videos...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <h2 className="text-title font-semibold text-gray-800 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-6">You need to be signed in to view your videos.</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-display font-bold text-gray-800">
                My Videos
              </h1>
              <p className="text-subtitle text-gray-600 mt-2">
                {pagination.totalResults ? `${pagination.totalResults} videos found` : 'Loading videos...'}
              </p>
            </div>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center gap-2"
            >
              Back to Dashboard
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search videos by title, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>

              {/* Sort */}
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SortByValue }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                  <option value="views">Views</option>
                  <option value="likes">Likes</option>
                </select>
                
                <button
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
                  }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  {filters.sortOrder === 'asc' ? <SortAsc className="h-5 w-5" /> : <SortDesc className="h-5 w-5" />}
                </button>
              </div>

              {/* Date Filter */}
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as DateRangeValue }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>

              {/* Privacy Filter */}
              <select
                value={filters.privacy}
                onChange={e => setFilters(prev => ({ ...prev, privacy: e.target.value as PrivacyValue }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
                <option value="all">All</option>
              </select>

              {/* View Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, viewType: 'grid' }))}
                  className={`px-3 py-2 ${filters.viewType === 'grid' ? 'bg-yellow-500 text-gray-900' : 'bg-white hover:bg-gray-50'}`}
                >
                  <Grid className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, viewType: 'list' }))}
                  className={`px-3 py-2 ${filters.viewType === 'list' ? 'bg-yellow-500 text-gray-900' : 'bg-white hover:bg-gray-50'}`}
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading videos</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => fetchVideos()}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Videos Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="bg-gray-200 h-32 rounded mb-4"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
            <p className="text-gray-600">
              {filters.search ? 'Try adjusting your search terms.' : 'No videos available for your channel.'}
            </p>
          </div>
        ) : (
          <div className={filters.viewType === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
          }>
            {filteredVideos.map((video, index) => (
              <VideoCard
                key={`${video.id.videoId}-${index}`}
                video={video}
                viewType={filters.viewType}
                onAnalyze={handleAnalyzeVideo}
                formatViewCount={formatViewCount}
                analyzingVideoId={analyzingVideoId}
                analyzeError={analyzeError}
                riskBadgeColor={getRiskBadgeColor(videoRiskLevels[video.id.videoId]?.riskLevel || '')}
                riskBadgeText={getRiskBadgeText(video.id.videoId)}
                riskData={videoRiskLevels[video.id.videoId]}
                onViewReports={handleViewReports}
              />
            ))}
          </div>
        )}

        {/* Load More Trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoadingMore && (
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-500 border-t-transparent"></div>
            )}
          </div>
        )}

        {/* End of Results */}
        {!hasMore && filteredVideos.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>You've reached the end of your videos</p>
          </div>
        )}
      </div>

      {/* Video Reports Modal */}
      {selectedVideoForReports && (
        <VideoReportsModal
          isOpen={reportsModalOpen}
          onClose={() => {
            setReportsModalOpen(false);
            setSelectedVideoForReports(null);
          }}
          videoId={selectedVideoForReports.id}
          videoTitle={selectedVideoForReports.title}
        />
      )}
    </div>
  );
}

// Video Card Component
interface VideoCardProps {
  video: Video;
  viewType: 'grid' | 'list';
  onAnalyze: (videoId: string) => void;
  formatViewCount: (count: string) => string;
  riskBadgeColor: string;
  riskBadgeText: string;
  riskData: { riskLevel: string; riskScore: number } | null;
  onViewReports: (videoId: string, title: string) => void;
}

function VideoCard({ video, viewType, onAnalyze, formatViewCount, analyzingVideoId, analyzeError, riskBadgeColor, riskBadgeText, riskData, onViewReports }: VideoCardProps & { analyzingVideoId: string | null, analyzeError: string | null }) {
  // Format statistics
  const formatStat = (stat: string | undefined) => {
    if (!stat) return '0';
    return formatViewCount(stat);
  };

  // Privacy badge
  const privacy = video.status?.privacyStatus;
  const privacyBadge =
    privacy === 'unlisted' ? (
      <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">Unlisted</span>
    ) : privacy === 'private' ? (
      <span className="ml-2 px-2 py-0.5 rounded-full bg-gray-300 text-gray-800 text-xs font-semibold">Private</span>
    ) : null;

  const isAnalyzing = analyzingVideoId === video.id.videoId;

  if (viewType === 'list') {
    return (
      <Card className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0">
          <img 
            src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url} 
            alt={video.snippet.title}
            className="w-32 h-20 object-cover rounded"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h3 className="font-semibold text-lg truncate">{video.snippet.title}</h3>
            {privacyBadge}
          </div>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{video.snippet.description}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(video.snippet.publishedAt), 'MMM d, yyyy')}
            </span>
            {/* Risk Level Badge */}
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${riskBadgeColor}`}>
              {riskBadgeText}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <Button 
            onClick={() => onAnalyze(video.id.videoId)}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></span>Analyzing...</span>
            ) : riskData ? 'Re-analyze' : 'Analyze'}
          </Button>
          {riskData && (
            <Button 
              variant="outlined"
              onClick={() => onViewReports(video.id.videoId, video.snippet.title)}
            >
              View Reports
            </Button>
          )}
        </div>
      </Card>
    );
  }

  // Redesigned grid card layout
  return (
    <Card className="overflow-hidden flex flex-col h-full border border-gray-200 rounded-xl bg-white p-0">
      {/* Thumbnail */}
      <div className="relative w-full h-48 bg-light-gray-100">
        <img 
          src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url} 
          alt={video.snippet.title}
          className="w-full h-48 object-cover rounded-t-xl"
          loading="lazy"
        />
      </div>
      {/* Card Content */}
      <div className="flex flex-col flex-1 p-6 pb-4">
        {/* Title & Description Block with fixed height */}
        <div className="mb-2" style={{ minHeight: '84px', maxHeight: '84px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          <div className="flex items-start min-h-[2.5em] mb-1">
            <h3 className="font-bold text-lg text-gray-900 leading-tight line-clamp-2 flex-1" style={{fontFamily:'Archivo, Satoshi, system-ui'}}>{video.snippet.title}</h3>
            {privacyBadge}
          </div>
          <p className="text-gray-600 text-sm line-clamp-2" style={{fontFamily:'Archivo, Satoshi, system-ui'}}>{video.snippet.description}</p>
        </div>
        {/* Risk Tag */}
        <div className="mb-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${riskBadgeColor} border`} style={{fontFamily:'Archivo, Satoshi, system-ui'}}>
            {riskBadgeText}
          </span>
        </div>
        {/* Date */}
        <div className="text-xs text-gray-500 mb-4 flex items-center gap-1" style={{fontFamily:'Archivo, Satoshi, system-ui'}}>
          <Calendar className="h-4 w-4" />
          {format(new Date(video.snippet.publishedAt), 'MMM d, yyyy')}
        </div>
        {/* Spacer to push actions to bottom */}
        <div className="flex-1" />
        {/* Actions Row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 w-full mt-2">
          <Button 
            className="flex-1 min-w-0" 
            onClick={() => onAnalyze(video.id.videoId)}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></span>Analyzing...</span>
            ) : riskData ? 'Re-analyze' : 'Analyze'}
          </Button>
          {riskData && (
            <Button 
              variant="outlined"
              className="flex-1 min-w-0"
              onClick={() => onViewReports(video.id.videoId, video.snippet.title)}
            >
              View Reports
            </Button>
          )}
        </div>
        {analyzeError && analyzingVideoId === video.id.videoId && (
          <div className="mt-2 text-xs text-red-600">{analyzeError}</div>
        )}
      </div>
    </Card>
  );
} 
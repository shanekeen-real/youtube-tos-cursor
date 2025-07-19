import React from 'react';
import { useRouter } from 'next/navigation';
import { Video, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { Video as VideoType, VideoRiskLevels } from './types';

interface VideoListProps {
  videos: VideoType[];
  videosLoading: boolean;
  videosError: string | null;
  videoRiskLevels: VideoRiskLevels;
  onViewReports: (videoId: string, title: string) => void;
  onRefresh: () => void;
}

export default function VideoList({ 
  videos, 
  videosLoading, 
  videosError, 
  videoRiskLevels, 
  onViewReports, 
  onRefresh 
}: VideoListProps) {
  const router = useRouter();

  return (
    <Card className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title font-semibold text-gray-800 flex items-center gap-2">
          <Video className="w-6 h-6 text-yellow-500" />
          Recent Videos
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={videosLoading}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh Videos"
            title="Refresh Videos"
          >
            <RefreshCw className={`h-5 w-5 text-gray-500 ${videosLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button variant="outlined" size="sm" onClick={() => router.push('/my-videos')}>
            View All
          </Button>
        </div>
      </div>
      
      <div>
        {videosLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-24 rounded-lg mb-2"></div>
                <div className="bg-gray-200 h-4 rounded mb-1"></div>
                <div className="bg-gray-200 h-3 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : videosError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-risk/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-risk" />
            </div>
            <p className="text-risk font-medium mb-2">Failed to load videos</p>
            <p className="text-gray-600 mb-6">{videosError}</p>
            <Button onClick={() => {
              onRefresh();
            }}>
              Retry
            </Button>
          </div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {videos.slice(0, 4).map((video) => {
              const videoId = video.id.videoId;
              const riskData = videoRiskLevels[videoId];
              const riskBadgeColor = riskData 
                ? riskData.riskLevel === 'HIGH' 
                  ? 'bg-risk text-white' 
                  : riskData.riskLevel === 'MEDIUM' 
                    ? 'bg-yellow-500 text-gray-900' 
                    : 'bg-safe text-white'
                : 'bg-gray-200 text-gray-800';
              const riskBadgeText = riskData ? `${riskData.riskLevel} Risk` : 'NO RISK SCORE';

              return (
                <div key={videoId} className="border border-gray-200 rounded-lg overflow-hidden hover:border-yellow-300 transition-colors">
                  <img 
                    src={video.snippet.thumbnails.medium.url} 
                    alt={video.snippet.title}
                    className="w-full h-24 object-cover"
                    loading="lazy"
                  />
                  <div className="p-3 space-y-2">
                    {/* Title & Description Block with fixed height */}
                    <div style={{ minHeight: '48px', maxHeight: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                      <div className="font-semibold text-sm text-gray-800 line-clamp-2">{video.snippet?.title}</div>
                      {/* If you want to add description, uncomment below and adjust height accordingly */}
                      {/* <div className="text-xs text-gray-600 line-clamp-1">{video.snippet?.description}</div> */}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${riskBadgeColor}`}>
                        {riskBadgeText}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(video.snippet.publishedAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm"
                        onClick={() => { 
                          const url = `https://www.youtube.com/watch?v=${videoId}`;
                          router.push(`/results?url=${encodeURIComponent(url)}`);
                        }}
                        className="flex-1"
                      >
                        {riskData ? 'Re-analyze' : 'Analyze'}
                      </Button>
                      {riskData && (
                        <Button 
                          variant="outlined" 
                          size="sm"
                          onClick={() => onViewReports(videoId, video.snippet.title)}
                        >
                          Reports
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-subtitle font-semibold text-gray-800 mb-2">No Videos Found</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              You haven't uploaded any videos to your YouTube channel yet. Upload some videos to start analyzing them for TOS compliance.
            </p>
            <Button 
              onClick={() => window.open('https://www.youtube.com/upload', '_blank')}
              variant="outlined"
            >
              Upload to YouTube
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
} 
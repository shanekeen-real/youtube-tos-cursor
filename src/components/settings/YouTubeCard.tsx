import React from 'react';
import { Youtube, CheckCircle } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';

interface YouTubeChannel {
  snippet?: {
    thumbnails?: { default?: { url?: string } };
    title?: string;
    customUrl?: string;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  };
}

interface YouTubeCardProps {
  ytChannel: YouTubeChannel | null;
  ytFetching: boolean;
  onConnectYouTube: () => void;
  onUnlinkYouTube: () => void;
}

export default function YouTubeCard({ 
  ytChannel, 
  ytFetching, 
  onConnectYouTube, 
  onUnlinkYouTube 
}: YouTubeCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Youtube className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">YouTube Connection</h2>
      </div>
      {ytChannel ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-safe/5 rounded-lg border border-safe/20">
            <CheckCircle className="w-5 h-5 text-safe" />
            <div className="flex-1">
              <p className="font-medium text-gray-800">{ytChannel.snippet?.title || 'YouTube Channel'}</p>
              <p className="text-sm text-gray-600">{ytChannel.snippet?.customUrl || 'Connected'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-800">
                {ytChannel.statistics?.subscriberCount ? parseInt(ytChannel.statistics.subscriberCount).toLocaleString() : '--'}
              </div>
              <div className="text-xs text-gray-600">Subscribers</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-800">
                {ytChannel.statistics?.viewCount ? parseInt(ytChannel.statistics.viewCount).toLocaleString() : '--'}
              </div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-800">
                {ytChannel.statistics?.videoCount ? parseInt(ytChannel.statistics.videoCount).toLocaleString() : '--'}
              </div>
              <div className="text-xs text-gray-600">Videos</div>
            </div>
          </div>
          <Button 
            variant="outlined" 
            onClick={onUnlinkYouTube}
            className="w-full"
          >
            Unlink YouTube
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-6">
            <Youtube className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">
              Connect your YouTube channel to unlock advanced features like revenue analysis and bulk scanning.
            </p>
            <Button 
              onClick={onConnectYouTube}
              disabled={ytFetching}
              className="w-full"
            >
              {ytFetching ? 'Connecting...' : 'Connect YouTube'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
} 
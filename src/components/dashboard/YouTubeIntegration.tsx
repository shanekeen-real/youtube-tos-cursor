import React from 'react';
import { CheckCircle } from 'lucide-react';
import Button from '@/components/Button';
import { YouTubeChannel, ChannelContext } from './types';

interface YouTubeIntegrationProps {
  ytChannel: YouTubeChannel | null;
  ytLoading: boolean;
  ytFetching: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

export default function YouTubeIntegration({ 
  ytChannel, 
  ytLoading, 
  ytFetching, 
  onConnect, 
  onRefresh 
}: YouTubeIntegrationProps) {
  if (ytLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading YouTube connection...</p>
        </div>
      </div>
    );
  }

  if (!ytChannel) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-yellow-600" />
        </div>
        <h3 className="text-subtitle font-semibold text-gray-800 mb-2">Connect Your YouTube Channel</h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Connect your YouTube channel to start analyzing your content for TOS compliance and protect your revenue.
        </p>
        <Button 
          onClick={onConnect}
          disabled={ytFetching}
        >
          {ytFetching ? 'Connecting...' : 'Connect YouTube'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-safe font-medium text-sm">
          <CheckCircle className="w-4 h-4" />
          YouTube Connected
        </span>
        <Button 
          size="sm" 
          variant="outlined"
          onClick={onRefresh}
          disabled={ytFetching}
        >
          {ytFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
} 
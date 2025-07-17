import React, { useEffect, useState } from 'react';
import Card from './Card';
import Button from './Button';
import { Users, Eye, Video, DollarSign, Shield, TrendingUp } from 'lucide-react';

interface YouTubeWelcomeModalProps {
  open: boolean;
  channelData: {
    title: string;
    description?: string;
    thumbnails?: { default?: { url: string } };
    statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
    subscriberCount?: string | number;
    viewCount?: string | number;
    videoCount?: string | number;
  };
  onClose: () => void;
}

export default function YouTubeWelcomeModal({ open, channelData, onClose }: YouTubeWelcomeModalProps) {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Support both .statistics and top-level fields for stats
  const stats = channelData.statistics && (
    channelData.statistics.subscriberCount || channelData.statistics.viewCount || channelData.statistics.videoCount
  ) ? channelData.statistics : {
    subscriberCount: channelData.subscriberCount,
    viewCount: channelData.viewCount,
    videoCount: channelData.videoCount,
  };

  useEffect(() => {
    if (open && !aiSummary && !loading && !error) {
      setLoading(true);
      setProgress(0);
      
      // Set sessionStorage when modal opens to prevent showing again
      // Include timestamp to handle edge cases with session persistence
      window.sessionStorage.setItem('ytWelcomeModalShown', Date.now().toString());
      
      // Animate progress bar
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      fetch('/api/analyze-channel-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelData })
      })
      .then(res => res.json())
      .then(data => {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
          setAiSummary(data.summary);
          setLoading(false);
        }, 300);
      })
      .catch(err => {
        clearInterval(progressInterval);
        setError(err.message || 'Failed to analyze channel');
        setLoading(false);
      });
    }
  }, [open, aiSummary, loading, error, channelData]);

  if (!open) return null;

  // Show loading state until summary is ready
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 relative flex flex-col items-center">
          <div className="text-xl font-bold text-gray-900 mb-4 text-center">Connecting YouTube Channel</div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-yellow-500 transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <div className="text-gray-500 text-sm">Analyzing your channel...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 relative flex flex-col items-center">
          <div className="text-xl font-bold text-gray-900 mb-4 text-center">Connection Error</div>
          <div className="text-gray-500 text-sm mb-6 text-center">{error}</div>
          <Button onClick={onClose} variant="primary">Close</Button>
        </div>
      </div>
    );
  }

  // Show modal content after summary is ready
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-0 relative flex flex-col items-center border border-gray-200 overflow-hidden">
        <div className="w-full px-6 pt-6 pb-2 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center leading-tight">
            Hey <span className="text-yellow-500">{channelData.title}</span>!
          </h2>
        </div>
        <div className="w-full flex flex-col md:flex-row gap-3 px-6 mb-2">
          <Card className="flex-1 flex flex-col items-center justify-center p-4 min-h-[70px] border border-gray-200 bg-gray-50">
            <div className="font-semibold text-base text-gray-900 mb-1 text-center">{channelData.title}</div>
            <div className="text-gray-500 text-xs text-center">{channelData.description}</div>
          </Card>
          <Card className="flex-1 flex flex-col items-center justify-center p-4 min-h-[70px] border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center gap-3 w-full mb-1">
              <div className="flex flex-col items-center flex-1">
                <Users className="text-yellow-500 mb-0.5" size={18} />
                <div className="font-semibold text-gray-900 text-base leading-none">{stats.subscriberCount ?? 0}</div>
                <div className="text-gray-500 text-xs">subscribers</div>
              </div>
              <div className="flex flex-col items-center flex-1">
                <Eye className="text-yellow-500 mb-0.5" size={18} />
                <div className="font-semibold text-gray-900 text-base leading-none">{stats.viewCount ?? 0}</div>
                <div className="text-gray-500 text-xs">views</div>
              </div>
              <div className="flex flex-col items-center flex-1">
                <Video className="text-yellow-500 mb-0.5" size={18} />
                <div className="font-semibold text-gray-900 text-base leading-none">{stats.videoCount ?? 0}</div>
                <div className="text-gray-500 text-xs">videos</div>
              </div>
            </div>
          </Card>
        </div>
        <Card className="w-full px-6 py-4 mb-1 border border-gray-200 bg-white">
          <div className="font-semibold text-base text-gray-900 mb-1">AI Channel Analysis</div>
          <div className="text-gray-700 text-xs leading-relaxed">{aiSummary}</div>
        </Card>
        <div className="w-full flex flex-col items-center px-6">
          <div className="text-xs text-gray-500 font-medium mb-1 mt-4 text-center">You now have access to:</div>
          <div className="flex flex-col gap-2 w-full mb-4">
            <Card className="p-3 border border-gray-200 bg-gray-50 w-full">
              <div className="flex flex-col items-center w-full">
                <DollarSign className="text-yellow-500 mb-1" size={18} />
                <div className="font-semibold text-gray-900 text-xs mb-0.5 text-center">Revenue at Risk Calculator</div>
                <div className="text-gray-500 text-xs text-center leading-snug">Instantly estimate how much of your YouTube earnings are at risk, personalized to your channel.</div>
              </div>
            </Card>
            <Card className="p-3 border border-gray-200 bg-gray-50 w-full">
              <div className="flex flex-col items-center w-full">
                <Shield className="text-green-500 mb-1" size={18} />
                <div className="font-semibold text-gray-900 text-xs mb-0.5 text-center">Personalized Contextual Scan</div>
                <div className="text-gray-500 text-xs text-center leading-snug">AI-powered, context-aware scans and suggestions tailored to your channel and audience.</div>
              </div>
            </Card>
            <Card className="p-3 border border-gray-200 bg-gray-50 w-full">
              <div className="flex flex-col items-center w-full">
                <TrendingUp className="text-blue-500 mb-1" size={18} />
                <div className="font-semibold text-gray-900 text-xs mb-0.5 text-center">AI Risk Score Analysis</div>
                <div className="text-gray-500 text-xs text-center leading-snug">Advanced AI models analyze your content for policy risk, with clear scores and flagged issues.</div>
              </div>
            </Card>
          </div>
        </div>
        <div className="w-full flex justify-center px-6 pb-6">
          <Button onClick={onClose} className="w-full max-w-xs text-sm font-semibold py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black border-none shadow-none transition-colors duration-200">Let's Go!</Button>
        </div>
      </div>
    </div>
  );
} 
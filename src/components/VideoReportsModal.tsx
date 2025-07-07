import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { X, Calendar, BarChart3, ExternalLink, FileText, Clock } from 'lucide-react';
import Button from './Button';
import Card from './Card';

interface VideoScan {
  scanId: string;
  videoId: string;
  riskLevel: string;
  riskScore: number;
  title: string;
  timestamp: Date;
  url: string;
  analysisSource: string;
}

interface VideoReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  videoTitle: string;
}

export default function VideoReportsModal({ isOpen, onClose, videoId, videoTitle }: VideoReportsModalProps) {
  const [scans, setScans] = useState<VideoScan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && videoId) {
      fetchVideoScans();
    }
  }, [isOpen, videoId]);

  const fetchVideoScans = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/get-video-scans?videoId=${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video scans');
      }
      const data = await response.json();
      setScans(data.scans);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch video scans');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewReport = (scanId: string) => {
    router.push(`/results?scanId=${scanId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Video Reports</h2>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{videoTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-3"></div>
                <span className="text-gray-600 font-medium">Loading reports...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reports</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <Button onClick={fetchVideoScans} className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Retry
              </Button>
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Found</h3>
              <p className="text-gray-500 mb-6">No analysis reports found for this video.</p>
              <Button onClick={onClose} variant="outlined">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="font-medium">{scans.length} report{scans.length !== 1 ? 's' : ''} found</span>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">Most recent first</span>
              </div>
              
              {scans.map((scan, index) => (
                <Card key={scan.scanId} className="hover:shadow-md transition-all duration-200 border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskBadgeColor(scan.riskLevel)}`}>
                          {scan.riskLevel} Risk
                        </span>
                        <span className="text-sm font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">
                          Score: {scan.riskScore}/100
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(scan.timestamp), 'MMM d, yyyy \'at\' h:mm a')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        onClick={() => handleViewReport(scan.scanId)}
                        className="whitespace-nowrap"
                      >
                        View Report
                      </Button>
                      <a
                        href={scan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-yellow-600 hover:text-yellow-700 transition-colors font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Video
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
} 
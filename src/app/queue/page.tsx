"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/lib/imports';
import { Button } from '@/lib/imports';
import { Badge } from '@/lib/imports';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Eye
} from 'lucide-react';
import { ScanQueueItem, UnreadCounts } from '@/types/queue';




interface QueueStats {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  totalCancelled: number;
}

export default function QueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queueItems, setQueueItems] = useState<ScanQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    totalPending: 0,
    totalProcessing: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalCancelled: 0
  });
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'in-queue' | 'pending' | 'processing' | 'completed' | 'failed'>('in-queue');
  const [processingQueue, setProcessingQueue] = useState(false);
  const [processingNotification, setProcessingNotification] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [autoProcessingTriggered, setAutoProcessingTriggered] = useState(false);

  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Fetch queue data with background polling support
  const fetchQueueData = async (isBackground = false) => {
    // Prevent concurrent fetches and add debouncing for background calls
    if (isFetching) return;
    
    // For background calls, only fetch if it's been at least 2 seconds since last fetch
    if (isBackground && Date.now() - lastFetchTime < 2000) {
      return;
    }
    
    try {
      setIsFetching(true);
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);
      
      // Use the filter directly - backend now handles all filtering logic
      const apiFilter = filter;
      console.log('Fetching queue data with filter:', filter, 'apiFilter:', apiFilter);
      // Skip stats calculation for background calls to reduce processing
      const skipStats = isBackground ? '&skipStats=true' : '';
      const response = await fetch(`/api/queue/user-scans?status=${apiFilter}${skipStats}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch queue data');
      }
      
      const data = await response.json();
      
      // Debug logging
      console.log('API Response for filter:', filter, 'Data:', data);
      console.log('Queue items count:', data.queueItems?.length || 0);
      
      // Use the queue items directly since backend now handles filtering
      let filteredQueueItems = data.queueItems;
      
      // Backend now handles filtering for 'in-queue' status
      // No additional client-side filtering needed
      filteredQueueItems = data.queueItems;
      
      // Smooth update without jarring refresh
      setQueueItems(prevItems => {
        // Only update if data has actually changed
        if (JSON.stringify(prevItems) !== JSON.stringify(filteredQueueItems)) {
          return filteredQueueItems;
        }
        return prevItems;
      });
      
      setStats(prevStats => {
        // Only update if stats have actually changed
        if (JSON.stringify(prevStats) !== JSON.stringify(data.stats)) {
          return data.stats;
        }
        return prevStats;
      });
      
      setUnreadCounts(prevCounts => {
        // Only update if unread counts have actually changed
        if (JSON.stringify(prevCounts) !== JSON.stringify(data.unreadCounts)) {
          console.log('Unread counts updated:', data.unreadCounts);
          return data.unreadCounts;
        }
        return prevCounts;
      });
    } catch (err: unknown) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Failed to fetch queue data');
      }
    } finally {
      setIsFetching(false);
      setLastFetchTime(Date.now());
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Process next pending scan
  const processNextScan = async () => {
    if (processingQueue) return; // Prevent concurrent processing
    
    try {
      setProcessingQueue(true);
      setProcessingNotification('Processing scan...');
      
      const response = await fetch('/api/queue/process-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Queue processing result:', data.message);
        
        if (data.message === 'Scan completed successfully') {
          setProcessingNotification('Scan completed successfully! Check the Completed tab to view results.');
          setTimeout(() => setProcessingNotification(null), 4000);
        }
        
        // Refresh queue data to show updated status (background update)
        await fetchQueueData(true);
      } else {
        const errorData = await response.json();
        console.warn('Queue processing failed:', errorData.error);
        setProcessingNotification(`Processing failed: ${errorData.error}`);
        setTimeout(() => setProcessingNotification(null), 5000);
      }
    } catch (err: unknown) {
      console.error('Error processing queue:', err);
      setProcessingNotification('Error processing queue');
      setTimeout(() => setProcessingNotification(null), 5000);
    } finally {
      setProcessingQueue(false);
    }
  };

  // Auto-process queue when there are pending scans
  const autoProcessQueue = async () => {
    if (stats.totalPending > 0 && !processingQueue && !autoProcessingTriggered) {
      console.log(`Auto-processing ${stats.totalPending} pending scans...`);
      setAutoProcessingTriggered(true);
      await processNextScan();
      
      // Continue processing if there are still pending scans
      if (stats.totalPending > 1) {
        setTimeout(() => {
          autoProcessQueue();
        }, 2000); // Wait 2 seconds before processing next scan
      } else {
        setAutoProcessingTriggered(false);
      }
    }
  };

  // Handle filter changes
  useEffect(() => {
    if (status === 'authenticated') {
      console.log('Filter changed to:', filter, 'Fetching data...');
      // When filter changes, fetch data for the new filter
      fetchQueueData(false); // Not background - this is a user-initiated change
    }
  }, [filter]); // Only depend on filter, not status

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      // Only fetch data if we don't have any queue items or if this is the first load
      if (queueItems.length === 0) {
        fetchQueueData(false); // Initial load (not background)
      }
      
      // Check if we should auto-process (e.g., when redirected from add-scan)
      const urlParams = new URLSearchParams(window.location.search);
      const autoProcess = urlParams.get('autoProcess');
      if (autoProcess === 'true') {
        // Small delay to ensure data is loaded first
        setTimeout(() => {
          autoProcessQueue();
        }, 2000);
      }
    }
  }, [status]); // Remove filter from dependencies to prevent resetting on tab switch

  // Auto-process queue when data changes (only if not already triggered)
  useEffect(() => {
    if (status === 'authenticated' && stats.totalPending > 0 && !autoProcessingTriggered) {
      // Small delay to ensure UI is updated first
      const timer = setTimeout(() => {
        autoProcessQueue();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [stats.totalPending, status, autoProcessingTriggered]);

  // Smart background polling - only when there are active scans and on "In Queue" tab
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Only poll if there are pending or processing scans AND we're on the "In Queue" tab
    const hasActiveScans = stats.totalPending > 0 || stats.totalProcessing > 0;
    const isOnInQueueTab = filter === 'in-queue';
    
    if (!hasActiveScans || !isOnInQueueTab) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    
    // Use shorter interval (2s) when there are processing scans, (3s) for pending, longer (10s) when idle
    const interval = setInterval(() => {
      fetchQueueData(true);
    }, stats.totalProcessing > 0 ? 2000 : hasActiveScans ? 3000 : 10000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [status, stats.totalPending, stats.totalProcessing]); // Removed filter from dependencies

  // Handle authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewResults = (queueItem: ScanQueueItem) => {
    if (queueItem.scanId) {
      router.push(`/results?scanId=${queueItem.scanId}`);
    }
  };

  const handleRetry = async (queueId: string) => {
    try {
      const response = await fetch('/api/queue/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId,
          status: 'pending',
          progress: 0,
          currentStep: 'Queued',
          currentStepIndex: 0,
          error: null
        })
      });
      
      if (response.ok) {
        fetchQueueData(true);
      }
    } catch (error) {
      console.error('Error retrying scan:', error);
    }
  };

  const handleCancel = async (queueId: string) => {
    try {
      const response = await fetch('/api/queue/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queueId,
          status: 'cancelled'
        })
      });
      
      if (response.ok) {
        fetchQueueData(true);
      }
    } catch (error) {
      console.error('Error cancelling scan:', error);
    }
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    console.log('Filter change requested:', newFilter, 'Current filter:', filter);
    setFilter(newFilter);
    
    // Mark tab as read when user clicks on it
    if (newFilter !== 'in-queue') {
      markTabAsRead(newFilter);
    }
  };

  const markTabAsRead = async (tabName: string) => {
    try {
      const response = await fetch('/api/queue/mark-tab-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabName })
      });
      
      if (response.ok) {
        // Update local unread counts
        setUnreadCounts(prev => ({
          ...prev,
          [tabName]: 0
        }));
      }
    } catch (error) {
      console.error('Error marking tab as read:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Scan Queue</h1>
              <p className="text-gray-600">Monitor and manage your video analysis scans</p>
            </div>
            
            {/* Background Polling Indicator */}
            {isPolling && (
              <div className="flex items-center text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span>Live updates</span>
              </div>
            )}
          </div>
          
          {/* Processing Notification */}
          {processingNotification && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
              <div className="flex items-center">
                <RefreshCw className="w-4 h-4 text-yellow-600 mr-2 animate-spin" />
                <span className="text-yellow-800">{processingNotification}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-gray-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">In Queue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filter === 'in-queue' 
                    ? queueItems.filter(item => ['pending', 'processing'].includes(item.status)).length 
                    : stats.totalPending + stats.totalProcessing
                  }
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <RefreshCw className="w-5 h-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalProcessing}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalCompleted}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalFailed}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalPending + stats.totalProcessing + stats.totalCompleted + stats.totalFailed + stats.totalCancelled}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {(['in-queue', 'pending', 'processing', 'completed', 'failed'] as const).map((status) => {
                const displayName = status === 'in-queue' ? 'In Queue' : status;
                const unreadCount = status === 'in-queue' ? 0 : unreadCounts[status as keyof UnreadCounts] || 0;
                
                return (
                  <div key={status} className="relative">
                    <Button
                      variant={filter === status ? 'primary' : 'outlined'}
                      onClick={() => handleFilterChange(status as typeof filter)}
                      className="capitalize"
                    >
                      {displayName}
                    </Button>
                    {unreadCount > 0 && (
                      <Badge 
                        variant={status === 'completed' ? 'safe' : status === 'failed' ? 'risk' : 'neutral'}
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              {/* Migration Button - Only show if there are non-active scans in In Queue tab */}
              {filter === 'in-queue' && queueItems.some(item => ['completed', 'cancelled', 'failed'].includes(item.status)) && (
                <Button
                  onClick={async () => {
                    try {
                      setIsMigrating(true);
                      const response = await fetch('/api/queue/migrate-completed-scans', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        console.log('Migration result:', data.message);
                        // Refresh the queue data to show the updated state
                        await fetchQueueData(true);
                      } else {
                        console.error('Failed to migrate completed scans');
                      }
                    } catch (error) {
                      console.error('Error migrating completed scans:', error);
                    } finally {
                      setIsMigrating(false);
                    }
                  }}
                  disabled={isMigrating}
                  variant="outlined"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  {isMigrating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {isMigrating ? 'Migrating...' : 'Move Non-Active to Archive'}
                </Button>
              )}
              
              {/* Process Queue Button */}
              {stats.totalPending > 0 && (
                <Button
                  onClick={processNextScan}
                  disabled={processingQueue}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  {processingQueue ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Process Queue ({stats.totalPending})
                    </>
                  )}
                </Button>
              )}

            </div>
          </div>
        </div>

        {/* Queue Items */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          </div>
        ) : error ? (
          <Card className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Queue</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => fetchQueueData()}>Try Again</Button>
            </div>
          </Card>
        ) : queueItems.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'in-queue' ? 'No active scans in queue' : 'No scans in queue'}
              </h3>
              <p className="text-gray-600 mb-4">
                {filter === 'in-queue' 
                  ? 'Start analyzing videos to see them here. Completed, cancelled, and failed scans automatically move to their respective tabs.'
                  : filter === 'completed'
                  ? 'No completed scans found'
                  : `No ${filter} scans found`
                }
              </p>
              {filter !== 'in-queue' && (
                <Button onClick={() => handleFilterChange('in-queue')}>View Active Scans</Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {queueItems.map((item, index) => (
              <Card 
                key={item.id} 
                className="p-6 transition-all duration-300 ease-in-out queue-item-enter"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Thumbnail */}
                    <img
                      src={item.videoThumbnail}
                      alt={item.videoTitle}
                      className="w-16 h-12 object-cover rounded-lg"
                    />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {item.videoTitle}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {item.videoId}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>{item.currentStep}</span>
                          <span>{item.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Status and Time */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(item.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>

                      </div>
                      
                      {/* Error Message */}
                      {item.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {item.error}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {item.status === 'completed' && item.scanId && (
                      <Button
                        size="sm"
                        onClick={() => handleViewResults(item)}
                        className="flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </Button>
                    )}
                    
                    {item.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={() => handleRetry(item.id)}
                        className="flex items-center space-x-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry</span>
                      </Button>
                    )}
                    
                    {(item.status === 'pending' || item.status === 'processing') && (
                      <Button
                        size="sm"
                        variant="outlined"
                        onClick={() => handleCancel(item.id)}
                        className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Cancel</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
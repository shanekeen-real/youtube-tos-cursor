"use client";
import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, FileText, History } from 'lucide-react';
import Button from '@/components/Button';
import VideoReportsModal from '@/components/VideoReportsModal';
import CPMSetupModal from '@/components/CPMSetupModal';
import YouTubeWelcomeModal from '@/components/YouTubeWelcomeModal';

// Import custom hooks
import { useDashboardData } from '@/hooks/dashboard/useDashboardData';
import { useYouTubeIntegration } from '@/hooks/dashboard/useYouTubeIntegration';
import { useVideoManagement } from '@/hooks/dashboard/useVideoManagement';
import { useRevenueAnalysis } from '@/hooks/dashboard/useRevenueAnalysis';
import { useDashboardModals } from '@/hooks/dashboard/useDashboardModals';

// Import dashboard components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import VideoList from '@/components/dashboard/VideoList';
import RevenueAnalysis from '@/components/dashboard/RevenueAnalysis';

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Custom hooks for data management
  const { 
    session, 
    status, 
    userProfile, 
    loading, 
    error, 
    canBatchScan, 
    fetchUserProfile 
  } = useDashboardData();

  const { 
    ytChannel, 
    ytLoading, 
    ytFetching, 
    channelContext, 
    showWelcomeModal, 
    setShowWelcomeModal, 
    handleYouTubeConnect 
  } = useYouTubeIntegration(session);

  const { 
    recentVideos, 
    videosLoading, 
    videosError, 
    videoRiskLevels, 
    videosLastFetched, 
    fetchRecentVideos, 
    handleRefreshVideos 
  } = useVideoManagement(session, ytChannel);

  const { 
    revenueData, 
    revenueLoading, 
    revenueError, 
    revenueLastFetched, 
    cpmSetupModalOpen, 
    setCpmSetupModalOpen, 
    fetchRevenue, 
    handleCPMSetupComplete, 
    handleRefreshRevenue 
  } = useRevenueAnalysis(session, ytChannel);

  const { 
    showCelebration, 
    setShowCelebration, 
    reportsModalOpen, 
    selectedVideoForReports, 
    handleUpgradeClick, 
    handleViewReports, 
    handleCloseReportsModal 
  } = useDashboardModals(session, fetchUserProfile);

  // Handle payment success celebration
  useEffect(() => {
    if (searchParams.get('payment_success') === 'true') {
      setShowCelebration(true);
      // Remove the query param so it doesn't show again
      const params = new URLSearchParams(window.location.search);
      params.delete('payment_success');
      router.replace(`/dashboard?${params.toString()}`);
    }
  }, [searchParams, router, setShowCelebration]);

  // Handle YouTube connection
  const handleYouTubeConnectWrapper = async () => {
    await handleYouTubeConnect();
    // After successful connection, refresh videos and revenue
    setTimeout(() => {
      fetchRecentVideos();
      fetchRevenue();
    }, 1000);
  };

  // Handle CPM setup
  const handleSetupCPM = () => {
    setCpmSetupModalOpen(true);
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-risk/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 text-risk">⚠️</div>
          </div>
          <p className="text-risk font-medium mb-2">Error</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-800 font-medium mb-6">Please sign in to view your dashboard.</p>
          <Button onClick={() => router.push('/')}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full flex flex-col bg-white pt-0">
      {/* Welcome Modal */}
      <YouTubeWelcomeModal
        open={showWelcomeModal}
        channelData={{
          title: channelContext?.channelData?.title || ytChannel?.snippet?.title || 'YouTube Channel',
          description: channelContext?.channelData?.description || ytChannel?.snippet?.description || '',
          subscriberCount: channelContext?.channelData?.subscriberCount || ytChannel?.statistics?.subscriberCount || 0,
          viewCount: channelContext?.channelData?.viewCount || ytChannel?.statistics?.viewCount || 0,
          videoCount: channelContext?.channelData?.videoCount || ytChannel?.statistics?.videoCount || 0,
          statistics: ytChannel?.statistics || {
            subscriberCount: String(channelContext?.channelData?.subscriberCount || 0),
            viewCount: String(channelContext?.channelData?.viewCount || 0),
            videoCount: String(channelContext?.channelData?.videoCount || 0)
          }
        }}
        onClose={() => setShowWelcomeModal(false)}
      />

      {/* Dashboard Header - User Profile & Stats */}
      <DashboardHeader 
        userProfile={userProfile} 
        onUpgradeClick={handleUpgradeClick}
        ytChannel={ytChannel}
        ytFetching={ytFetching}
        channelContext={channelContext}
        canBatchScan={canBatchScan}
        handleYouTubeConnect={handleYouTubeConnectWrapper}
      />

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue at Risk Card */}
          <RevenueAnalysis 
            revenueData={revenueData}
            revenueLoading={revenueLoading}
            revenueError={revenueError}
            ytChannel={ytChannel}
            onSetupCPM={handleSetupCPM}
            onRefresh={handleRefreshRevenue}
          />

          {/* Recent Videos Card */}
          {ytChannel && (
            <VideoList 
              videos={recentVideos}
              videosLoading={videosLoading}
              videosError={videosError}
              videoRiskLevels={videoRiskLevels}
              onViewReports={handleViewReports}
              onRefresh={handleRefreshVideos}
            />
          )}
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-2xl">🎉</div>
            </div>
            <h2 className="text-title font-semibold text-gray-800 mb-2">
              Welcome to Yellow Dollar!
            </h2>
            <p className="text-gray-600 mb-6">
              Your subscription has been activated. You now have access to all premium features.
            </p>
            <Button onClick={() => setShowCelebration(false)}>
              Get Started
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedVideoForReports && (
        <VideoReportsModal
          isOpen={reportsModalOpen}
          onClose={handleCloseReportsModal}
          videoId={selectedVideoForReports.id}
          videoTitle={selectedVideoForReports.title}
        />
      )}

      <CPMSetupModal
        isOpen={cpmSetupModalOpen}
        onClose={() => setCpmSetupModalOpen(false)}
        onSetupComplete={handleCPMSetupComplete}
      />
    </main>
  );
} 
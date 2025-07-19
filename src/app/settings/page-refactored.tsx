"use client";
import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/lib/imports';
import { 
  TwoFactorWrapper,
  YouTubeWelcomeModal,
  TwoFactorSetupModal,
  TwoFactorDisableModal,
  useSettingsData,
  useSettingsYouTube,
  useSettingsModals,
  useSettingsActions,
  AccountDetailsCard,
  UsageCard,
  SubscriptionCard,
  YouTubeCard,
  PrivacyCard,
  PreferencesCard,
  QuickActionsCard
} from '@/lib/imports';

export default function SettingsPageRefactored() {
  // Custom hooks for data management
  const { 
    session, 
    status, 
    userProfile, 
    loading, 
    error, 
    progress, 
    fetchUserProfile 
  } = useSettingsData();

  const { 
    ytChannel, 
    ytLoading, 
    ytFetching, 
    channelContext, 
    showWelcomeModal, 
    setShowWelcomeModal, 
    handleConnectYouTube, 
    handleUnlinkYouTube 
  } = useSettingsYouTube(session);

  const { 
    showTwoFactorSetupModal, 
    showTwoFactorDisableModal, 
    openTwoFactorSetup, 
    closeTwoFactorSetup, 
    openTwoFactorDisable, 
    closeTwoFactorDisable 
  } = useSettingsModals();

  const { 
    dark, 
    toggleDarkMode, 
    managingSubscription, 
    subscriptionError, 
    handleManageSubscription, 
    clearSubscriptionError, 
    exportStatus, 
    handleExport, 
    deleteStatus, 
    deleting, 
    handleDelete 
  } = useSettingsActions();

  // Dark mode effect
  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [dark]);

  // Handle YouTube connection with error handling
  const handleConnectYouTubeWithErrorHandling = async () => {
    try {
      await handleConnectYouTube();
    } catch (error: any) {
      console.error('YouTube connection error:', error);
      // Error handling is done in the hook, but we can add additional UI feedback here if needed
    }
  };

  // Handle YouTube unlink with confirmation
  const handleUnlinkYouTubeWithConfirmation = async () => {
    // Business logic moved to hook - this is just UI coordination
    await handleUnlinkYouTube();
  };

  // Handle 2FA success callbacks
  const handleTwoFactorSuccess = () => {
    // Refresh user profile to show updated 2FA status
    fetchUserProfile();
  };

  // Loading state
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-800 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Authentication check
  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-risk/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-risk" />
          </div>
          <p className="text-gray-800 font-medium mb-6">Please sign in to access settings.</p>
          <Button onClick={() => window.location.href = '/api/auth/signin'}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <TwoFactorWrapper>
      <main className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-title font-semibold text-gray-800 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your account preferences and connections.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Account Settings */}
            <div className="space-y-6">
              <AccountDetailsCard userProfile={userProfile} />
              <UsageCard userProfile={userProfile} progress={progress} />
              <SubscriptionCard 
                userProfile={userProfile}
                managingSubscription={managingSubscription}
                subscriptionError={subscriptionError}
                onManageSubscription={handleManageSubscription}
                onClearSubscriptionError={clearSubscriptionError}
              />
            </div>

            {/* Right Column - Connections & Preferences */}
            <div className="space-y-6">
              <YouTubeCard 
                ytChannel={ytChannel}
                ytFetching={ytFetching}
                onConnectYouTube={handleConnectYouTubeWithErrorHandling}
                onUnlinkYouTube={handleUnlinkYouTubeWithConfirmation}
              />
              <PrivacyCard 
                exportStatus={exportStatus}
                deleteStatus={deleteStatus}
                deleting={deleting}
                onExport={handleExport}
                onDelete={handleDelete}
              />
              <PreferencesCard 
                userProfile={userProfile}
                dark={dark}
                onToggleDarkMode={toggleDarkMode}
                onOpenTwoFactorSetup={openTwoFactorSetup}
                onOpenTwoFactorDisable={openTwoFactorDisable}
              />
              <QuickActionsCard />
            </div>
          </div>
        </div>
        
        {/* YouTube Welcome Modal */}
        <YouTubeWelcomeModal
          open={showWelcomeModal}
          channelData={{
            title: channelContext?.channelData?.title || ytChannel?.snippet?.title || 'YouTube Channel',
            description: channelContext?.channelData?.description || '',
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

        {/* Two-Factor Authentication Modals */}
        <TwoFactorSetupModal
          open={showTwoFactorSetupModal}
          onClose={closeTwoFactorSetup}
          onSuccess={handleTwoFactorSuccess}
        />

        <TwoFactorDisableModal
          open={showTwoFactorDisableModal}
          onClose={closeTwoFactorDisable}
          onSuccess={handleTwoFactorSuccess}
        />
      </main>
    </TwoFactorWrapper>
  );
} 
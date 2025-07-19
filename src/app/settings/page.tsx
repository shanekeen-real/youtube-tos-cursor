"use client";
import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useSession } from 'next-auth/react';

import Link from 'next/link';
import { getTierLimits } from '@/types/subscription';
import { Settings, User, CreditCard, Youtube, Moon, Sun, AlertTriangle, CheckCircle, Shield, Smartphone } from 'lucide-react';
import { 
  YouTubeWelcomeModal,
  TwoFactorSetupModal,
  TwoFactorDisableModal,
  TwoFactorWrapper
} from '@/lib/imports';
import { useToastContext } from '@/contexts/ToastContext';
import { getAuth } from 'firebase/auth';
import { signOut } from "next-auth/react";

// Define the structure of a user's profile data
interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
  stripeCustomerId?: string;
  subscriptionData?: {
    renewalDate?: string;
    cancelledAt?: string;
    expiresAt?: string;
  };
  twoFactorEnabled?: boolean;
  twoFactorSetupAt?: string;
  twoFactorEnabledAt?: string;
}

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

export default function SettingsPage() {
  const { showSuccess, showError } = useToastContext();
  const [dark, setDark] = useState(false);
  const { data: session } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ytChannel, setYtChannel] = useState<YouTubeChannel | null>(null);
  const [ytConnecting, setYtConnecting] = useState(false);
  const [ytFetching, setYtFetching] = useState(false);
  const [channelContext, setChannelContext] = useState<any>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [showTwoFactorSetupModal, setShowTwoFactorSetupModal] = useState(false);
  const [showTwoFactorDisableModal, setShowTwoFactorDisableModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isFreshConnection, setIsFreshConnection] = useState(false);
  
  useEffect(() => {
    if (dark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [dark]);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch('/api/get-user-profile');
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.userProfile as UserProfile);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };
    fetchUserProfile();
  }, [session?.user?.id]);
  
  useEffect(() => {
    const fetchYouTube = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch('/api/get-user-profile');
        if (response.ok) {
          const data = await response.json();
          if (data.userProfile?.youtube?.channel) {
            setYtChannel(data.userProfile.youtube.channel as YouTubeChannel);
            // Also get channel context if available
            if (data.userProfile.youtube?.channelContext) {
              setChannelContext(data.userProfile.youtube.channelContext);
            }
          } else {
            setYtChannel(null);
            setChannelContext(null);
          }
        } else {
          setYtChannel(null);
          setChannelContext(null);
        }
      } catch (err) {
        console.error('Failed to fetch YouTube data:', err);
        setYtChannel(null);
        setChannelContext(null);
      }
    };
    fetchYouTube();

    // Refresh YouTube data when user returns to the tab
    const handleFocus = () => {
      if (session?.user?.id) {
        fetchYouTube();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session?.user?.id]);
  


  // Show welcome modal when YouTube is connected (same logic as Dashboard)
  useEffect(() => {
    // Add a small delay to ensure data is properly loaded
    const timer = setTimeout(() => {
      console.log('Welcome modal trigger check:', {
        hasChannelContext: !!channelContext,
        hasChannelData: !!channelContext?.channelData,
        hasYtChannel: !!ytChannel,
        isFreshConnection: isFreshConnection,
        sessionStorageShown: window.sessionStorage.getItem('ytWelcomeModalShown'),
        channelContext: channelContext
      });
      
      // Show modal only if this is a NEW connection (not just existing data)
      // We need to track if this is the first time we're seeing this channel data
      const modalShown = window.sessionStorage.getItem('ytWelcomeModalShown');
      const modalShownTime = modalShown ? parseInt(modalShown) : 0;
      const isRecent = Date.now() - modalShownTime < 24 * 60 * 60 * 1000; // 24 hours
      
      // Only show modal if this is a fresh connection (not just existing data)
      const hasChannelData = channelContext?.channelData || ytChannel;
      const shouldShowModal = hasChannelData && isFreshConnection && (!modalShown || !isRecent);
      
      console.log('Should show modal:', shouldShowModal);
      
      if (shouldShowModal) {
        console.log('Triggering welcome modal');
        setShowWelcomeModal(true);
        // Reset the fresh connection flag after triggering modal
        setIsFreshConnection(false);
        // Don't set sessionStorage immediately - let the modal handle it
      }
    }, 500); // 500ms delay
    
    return () => clearTimeout(timer);
  }, [channelContext, ytChannel]);
  
  const progress = userProfile ? (userProfile.scanCount / userProfile.scanLimit) * 100 : 0;
  
  const handleUnlinkYouTube = async () => {
    if (!session?.user?.id) return;
    if (!window.confirm('Are you sure you want to unlink your YouTube channel?')) return;
    try {
      const response = await fetch('/api/unlink-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setYtChannel(null);
        // Clear the welcome modal session flag so it will show again on reconnect
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ytWelcomeModalShown');
        }
        showSuccess('YouTube Unlinked', 'Your YouTube channel has been successfully unlinked.');
      } else {
        showError('YouTube Unlink Error', 'Failed to unlink YouTube channel. Please try again.');
      }
    } catch (err) {
      showError('YouTube Unlink Error', 'Failed to unlink YouTube channel. Please try again.');
    }
  };

  const handleConnectYouTube = async () => {
    if (!session?.user?.id) return;
    setYtFetching(true);
    try {
      const response = await fetch('/api/fetch-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('YouTube connection response:', data);
        setYtChannel(data.channel);
        if (data.channelContext) {
          console.log('Setting channel context:', data.channelContext);
          setChannelContext(data.channelContext);
        } else {
          console.log('No channel context in response');
        }
        // Mark this as a fresh connection to trigger welcome modal
        setIsFreshConnection(true);
        showSuccess('YouTube Connected', 'Your YouTube channel has been successfully connected!');
      } else {
        const errorData = await response.json();
        console.error('Failed to connect YouTube:', errorData.error);
        showError('YouTube Connection Error', 'Failed to connect YouTube channel. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting YouTube:', error);
      showError('YouTube Connection Error', 'Failed to connect YouTube channel. Please try again.');
    } finally {
      setYtFetching(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session?.user?.id) return;
    setManagingSubscription(true);
    setSubscriptionError(null); // Clear any previous errors
    
    try {
      const response = await fetch('/api/create-customer-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        console.error('Failed to create customer portal session:', errorData);
        
        // Show more helpful error messages based on the error type
        let errorMessage = 'Failed to open subscription management. Please try again.';
        
        if (errorData.error === 'No Stripe customer ID found') {
          errorMessage = errorData.details || 'You need to have an active subscription to access the customer portal. Please upgrade your plan first.';
        } else if (errorData.error === 'No active subscription found') {
          errorMessage = errorData.details || 'Your subscription may have expired or been cancelled. Please check your subscription status or upgrade your plan.';
        } else if (errorData.error === 'Failed to verify subscription status') {
          errorMessage = errorData.details || 'Unable to check your subscription status. Please try again or contact support.';
        } else if (errorData.details) {
          errorMessage = errorData.details;
        }
        
        setSubscriptionError(errorMessage);
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      setSubscriptionError('Failed to open subscription management. Please try again.');
    } finally {
      setManagingSubscription(false);
    }
  };

  // Privacy controls handlers
  const handleExport = async () => {
    setExportStatus(null);
    try {
      const res = await fetch("/api/export-user-data");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yellow-dollar-user-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setExportStatus("Export successful. Check your downloads.");
    } catch (err: any) {
      setExportStatus("Export failed: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setDeleteStatus("Account deleted successfully.");
      // Automatically sign out and redirect after deletion
      setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, 1500);
    } catch (err: any) {
      setDeleteStatus("Delete failed: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

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
          {/* Account Settings */}
          <div className="space-y-6">
            {/* Account Details */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-yellow-500" />
                <h2 className="text-subtitle font-semibold text-gray-800">Account Details</h2>
              </div>
              {userProfile && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Email</span>
                    <span className="font-medium text-gray-800">{userProfile.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-medium text-gray-800">{new Date(userProfile.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Subscription Tier</span>
                    <span className="font-medium text-gray-800 capitalize">{userProfile.subscriptionTier}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Usage */}
            {userProfile && (
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-subtitle font-semibold text-gray-800">Usage</h2>
                </div>
                {(() => {
                  const tierLimits = getTierLimits(userProfile.subscriptionTier);
                  const displayLimit = tierLimits.scanLimit === 'unlimited' ? 'unlimited' : tierLimits.scanLimit;
                  return (
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        You have used <span className="font-semibold text-gray-800">{userProfile.scanCount}</span> of your <span className="font-semibold text-gray-800">{displayLimit}</span> scans this month.
                      </p>
                      <div className="space-y-2">
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 transition-all duration-300"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="text-right text-caption text-gray-500">{Math.round(progress)}% used</div>
                      </div>
                    </div>
                  );
                })()}
              </Card>
            )}

            {/* Subscription Management */}
            {userProfile && (
              <Card>
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-5 h-5 text-yellow-500" />
                  <h2 className="text-subtitle font-semibold text-gray-800">Subscription</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Current Plan</span>
                    <span className="font-medium text-gray-800 capitalize">{userProfile.subscriptionTier}</span>
                  </div>
                  
                  {userProfile.subscriptionTier !== 'free' ? (
                    <>
                      {(userProfile.subscriptionData?.expiresAt)
                        ? (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Subscription ends on</span>
                            <span className="font-medium text-gray-800">{new Date(userProfile.subscriptionData.expiresAt).toLocaleDateString()}</span>
                          </div>
                        )
                        : userProfile.subscriptionData?.renewalDate ? (
                          <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">Next Billing</span>
                            <span className="font-medium text-gray-800">{new Date(userProfile.subscriptionData.renewalDate).toLocaleDateString()}</span>
                          </div>
                        ) : null}
                      {userProfile.subscriptionData?.cancelledAt && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Cancelled</span>
                          <span className="font-medium text-gray-800">{new Date(userProfile.subscriptionData.cancelledAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <Button 
                        onClick={handleManageSubscription}
                        disabled={managingSubscription}
                        className="w-full"
                      >
                        {managingSubscription ? 'Opening...' : 'Manage Subscription'}
                      </Button>
                    </>
                  ) : (
                    <>
                      {userProfile.stripeCustomerId && (
                        <div className="text-center py-4">
                          <p className="text-gray-600 mb-3">You previously had a subscription that may have expired or been cancelled.</p>
                          {subscriptionError && (
                            <div className="mb-3 p-3 bg-risk/5 border border-risk/20 rounded-lg">
                              <p className="text-sm text-risk">{subscriptionError}</p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Button 
                              onClick={handleManageSubscription}
                              disabled={managingSubscription}
                              variant="outlined"
                              className="w-full"
                            >
                              {managingSubscription ? 'Checking...' : 'Check Subscription Status'}
                            </Button>
                            <Button 
                              onClick={() => {
                                setSubscriptionError(null);
                                window.location.href = '/pricing';
                              }}
                              className="w-full"
                            >
                              Upgrade Plan
                            </Button>
                          </div>
                        </div>
                      )}
                      {!userProfile.stripeCustomerId && (
                        <div className="text-center py-4">
                          <p className="text-gray-600 mb-3">Upgrade to unlock more features and higher scan limits.</p>
                          <Button 
                            onClick={() => {
                              setSubscriptionError(null);
                              window.location.href = '/pricing';
                            }}
                            className="w-full"
                          >
                            View Plans
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Connections & Preferences */}
          <div className="space-y-6">
            {/* YouTube Connection */}
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
                      <div className="text-lg font-semibold text-gray-800">{ytChannel.statistics?.subscriberCount ? parseInt(ytChannel.statistics.subscriberCount).toLocaleString() : '--'}</div>
                      <div className="text-xs text-gray-600">Subscribers</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-800">{ytChannel.statistics?.viewCount ? parseInt(ytChannel.statistics.viewCount).toLocaleString() : '--'}</div>
                      <div className="text-xs text-gray-600">Views</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-lg font-semibold text-gray-800">{ytChannel.statistics?.videoCount ? parseInt(ytChannel.statistics.videoCount).toLocaleString() : '--'}</div>
                      <div className="text-xs text-gray-600">Videos</div>
                    </div>
                  </div>
                  <Button 
                    variant="outlined" 
                    onClick={handleUnlinkYouTube}
                    className="w-full"
                  >
                    Unlink YouTube
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <Youtube className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">Connect your YouTube channel to unlock advanced features like revenue analysis and bulk scanning.</p>
                    <Button 
                      onClick={handleConnectYouTube}
                      disabled={ytFetching}
                      className="w-full"
                    >
                      {ytFetching ? 'Connecting...' : 'Connect YouTube'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Privacy Controls Card */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-yellow-500" />
                <h2 className="text-subtitle font-semibold text-gray-800">Privacy & Data Controls</h2>
              </div>
              <button onClick={handleExport} className="w-full mb-3 px-4 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 transition">
                Export My Data
              </button>
              {exportStatus && <div className="mb-3 text-sm" style={{ color: exportStatus.startsWith("Export successful") ? "#00C853" : "#FF3B30" }}>{exportStatus}</div>}
              <button onClick={handleDelete} disabled={deleting} className={`w-full px-4 py-2 rounded-lg ${deleting ? "bg-gray-200 text-gray-500" : "bg-risk text-white hover:bg-red-600"} font-semibold transition`}>
                {deleting ? "Deleting..." : "Delete My Account"}
              </button>
              {deleteStatus && <div className="mt-3 text-sm" style={{ color: deleteStatus.startsWith("Account deleted") ? "#00C853" : "#FF3B30" }}>{deleteStatus}</div>}
              <div className="mt-4 text-xs text-gray-500">
                Download a copy of your data or permanently delete your account. Deletion is irreversible.
              </div>
            </Card>

            {/* Preferences */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-yellow-500" />
                <h2 className="text-subtitle font-semibold text-gray-800">Preferences</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    {dark ? <Moon className="w-4 h-4 text-gray-600" /> : <Sun className="w-4 h-4 text-gray-600" />}
                    <span className="text-gray-700">Dark Mode</span>
                  </div>
                  <Button 
                    variant={dark ? 'primary' : 'outlined'} 
                    size="sm"
                    onClick={() => setDark((d) => !d)}
                  >
                    {dark ? 'On' : 'Off'}
                  </Button>
                </div>
                
                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-4 h-4 text-gray-600" />
                    <div>
                      <span className="text-gray-700">Two-Factor Authentication</span>
                      <p className="text-xs text-gray-500">
                        {userProfile?.twoFactorEnabled 
                          ? `Enabled on ${userProfile.twoFactorEnabledAt ? new Date(userProfile.twoFactorEnabledAt).toLocaleDateString() : 'recently'}`
                          : 'Add an extra layer of security to your account'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {userProfile?.twoFactorEnabled ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 px-2 py-1 bg-safe/10 rounded-full">
                          <CheckCircle className="w-3 h-3 text-safe" />
                          <span className="text-xs text-safe font-medium">Enabled</span>
                        </div>
                        <Button 
                          variant="outlined" 
                          size="sm"
                          onClick={() => setShowTwoFactorDisableModal(true)}
                        >
                          Disable
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outlined" 
                        size="sm"
                        onClick={() => setShowTwoFactorSetupModal(true)}
                      >
                        Enable
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="text-caption text-gray-500">
                  More settings and preferences coming soon...
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-5 h-5 text-yellow-500" />
                <h2 className="text-subtitle font-semibold text-gray-800">Quick Actions</h2>
              </div>
              <div className="space-y-3">
                <Button 
                  variant="outlined" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full justify-start"
                >
                  Go to Dashboard
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => window.location.href = '/scan-history'}
                  className="w-full justify-start"
                >
                  View Scan History
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => window.location.href = '/pricing'}
                  className="w-full justify-start"
                >
                  Manage Subscription
                </Button>
              </div>
            </Card>
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
        onClose={() => setShowTwoFactorSetupModal(false)}
        onSuccess={() => {
          // Refresh user profile to show updated 2FA status
          const fetchUserProfile = async () => {
            try {
              const response = await fetch('/api/get-user-profile');
              if (response.ok) {
                const data = await response.json();
                setUserProfile(data.userProfile as UserProfile);
              }
            } catch (err) {
              console.error('Failed to refresh user profile:', err);
            }
          };
          fetchUserProfile();
        }}
      />

      <TwoFactorDisableModal
        open={showTwoFactorDisableModal}
        onClose={() => setShowTwoFactorDisableModal(false)}
        onSuccess={() => {
          const fetchUserProfile = async () => {
            try {
              const response = await fetch('/api/get-user-profile');
              if (response.ok) {
                const data = await response.json();
                setUserProfile(data.userProfile as UserProfile);
              }
            } catch (err) {
              console.error('Failed to refresh user profile:', err);
            }
          };
          fetchUserProfile();
        }}
      />
    </main>
    </TwoFactorWrapper>
  );
} 
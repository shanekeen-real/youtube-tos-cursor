"use client";
import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useSession } from 'next-auth/react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import Link from 'next/link';
import { getTierLimits } from '@/types/subscription';
import { Settings, User, CreditCard, Youtube, Moon, Sun, AlertTriangle, CheckCircle, Shield } from 'lucide-react';

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
  const [dark, setDark] = useState(false);
  const { data: session } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ytChannel, setYtChannel] = useState<YouTubeChannel | null>(null);
  const [ytConnecting, setYtConnecting] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  
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
      const db = getFirestore(app);
      const userRef = doc(db, 'users', session.user.id);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) setUserProfile(userDoc.data() as UserProfile);
    };
    fetchUserProfile();
  }, [session?.user?.id]);
  
  useEffect(() => {
    const fetchYouTube = async () => {
      if (!session?.user?.id) return;
      const db = getFirestore(app);
      const userRef = doc(db, 'users', session.user.id);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().youtube?.channel) {
        setYtChannel(userDoc.data().youtube.channel as YouTubeChannel);
      } else {
        setYtChannel(null);
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
  
  const progress = userProfile ? (userProfile.scanCount / userProfile.scanLimit) * 100 : 0;
  
  const handleUnlinkYouTube = async () => {
    if (!session?.user?.id) return;
    if (!window.confirm('Are you sure you want to unlink your YouTube channel?')) return;
    const db = getFirestore(app);
    const userRef = doc(db, 'users', session.user.id);
    try {
      await updateDoc(userRef, {
        youtube: null
      });
      setYtChannel(null);
    } catch (err) {
      alert('Failed to unlink YouTube channel. Please try again.');
    }
  };

  const handleConnectYouTube = async () => {
    if (!session?.user?.id) return;
    setYtConnecting(true);
    try {
      const response = await fetch('/api/fetch-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setYtChannel(data.channel);
      } else {
        const errorData = await response.json();
        console.error('Failed to connect YouTube:', errorData.error);
        alert('Failed to connect YouTube channel. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting YouTube:', error);
      alert('Failed to connect YouTube channel. Please try again.');
    } finally {
      setYtConnecting(false);
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

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <main className="min-h-screen bg-gray-50">
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
                      disabled={ytConnecting}
                      className="w-full"
                    >
                      {ytConnecting ? 'Connecting...' : 'Connect YouTube'}
                    </Button>
                  </div>
                </div>
              )}
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
    </main>
  );
} 
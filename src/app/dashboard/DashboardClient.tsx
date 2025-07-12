"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import ConnectYouTubeButton from '@/components/ConnectYouTubeButton';
import { format } from 'date-fns';
import { Calendar, TrendingUp, Users, Video, AlertTriangle, CheckCircle, Clock, Calculator, DollarSign, Shield, Settings, Lock } from 'lucide-react';
import VideoReportsModal from '@/components/VideoReportsModal';
import CPMSetupModal from '@/components/CPMSetupModal';
import * as Tooltip from '@radix-ui/react-tooltip';
import YouTubeWelcomeModal from '@/components/YouTubeWelcomeModal';

// Define the structure of a user's profile data
interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
}

// Load the Stripe.js library with your publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ytChannel, setYtChannel] = useState<any>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytFetching, setYtFetching] = useState(false);
  const [channelContext, setChannelContext] = useState<any>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videoRiskLevels, setVideoRiskLevels] = useState<{ [videoId: string]: { riskLevel: string; riskScore: number } | null }>({});
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [selectedVideoForReports, setSelectedVideoForReports] = useState<{ id: string; title: string } | null>(null);
  const [revenueData, setRevenueData] = useState<null | {
    atRisk: number;
    secured: number;
    total: number;
    details: {
      videoId: string;
      title: string;
      earnings: number;
      riskLevel: string;
      cpm?: number;
      rpm?: number;
      monetizedPercent?: number;
      includeCut?: boolean;
      viewCount: number;
      timestamp: string;
    }[];
    setupRequired?: boolean;
  }>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [cpmSetupModalOpen, setCpmSetupModalOpen] = useState(false);
  const [canBatchScan, setCanBatchScan] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Log user ID to browser console for testing
  useEffect(() => {
    if (session?.user?.id) {
      console.log('User ID:', session.user.id);
    } else {
      console.log('No user ID found in session');
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (searchParams.get('payment_success') === 'true') {
      setShowCelebration(true);
      // Remove the query param so it doesn't show again
      const params = new URLSearchParams(window.location.search);
      params.delete('payment_success');
      router.replace(`/dashboard?${params.toString()}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const db = getFirestore(app);
        const userRef = doc(db, 'users', session.user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
          setCanBatchScan(userDoc.data().subscriptionTier === 'advanced' || userDoc.data().subscriptionTier === 'enterprise');
        } else {
          // User doc missing: do NOT auto-create. Block dashboard and show error.
          setError('Your account data is missing. Please contact support.');
          setUserProfile(null);
          setCanBatchScan(false);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchYouTube = async () => {
      setYtLoading(true);
      if (!session?.user?.id) {
        setYtChannel(null);
        setYtLoading(false);
        return;
      }
      try {
        const db = getFirestore(app);
        const userRef = doc(db, 'users', session.user.id);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().youtube?.channel) {
          setYtChannel(userDoc.data().youtube.channel);
          // Also get channel context if available
          if (userDoc.data().youtube?.channelContext) {
            setChannelContext(userDoc.data().youtube.channelContext);
          }
        } else {
          // No channel data found, set to null (don't auto-reconnect)
            setYtChannel(null);
            setChannelContext(null);
        }
      } catch {
        setYtChannel(null);
      } finally {
        setYtLoading(false);
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
  
  const handleUpgradeClick = async () => {
    if (!session?.user?.id) {
        alert("Please sign in to upgrade.");
        return;
    }
    try {
        const { data } = await axios.post('/api/create-checkout-session', {
            userId: session.user.id
        });
        const stripe = await stripePromise;
        if (stripe) {
            await stripe.redirectToCheckout({ sessionId: data.sessionId });
        }
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        alert("Failed to start the upgrade process. Please try again.");
    }
  };
  
  const progress = userProfile ? (userProfile.scanCount / userProfile.scanLimit) * 100 : 0;

  // Fetch recent 5 videos after YouTube channel is connected
  useEffect(() => {
    const fetchRecentVideos = async () => {
      if (!ytChannel || !session?.user?.id) return;
      setVideosLoading(true);
      setVideosError(null);
      try {
        console.log('Fetching recent videos for user:', session.user.id);
        const response = await fetch('/api/fetch-youtube-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageSize: 5 }),
        });
        
        console.log('Videos API response status:', response.status);
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
          console.error('Videos API error:', errorData);
          const errorMessage = errorData.error || errorData.details || `Failed to fetch videos (${response.status})`;
          setVideosError(errorMessage);
          setRecentVideos([]);
        } else {
          const data = await response.json();
          console.log('Successfully fetched videos:', data.items?.length || 0);
          setRecentVideos(data.items || []);
          
          // Fetch risk levels for these videos
          if (data.items && data.items.length > 0) {
            await fetchRiskLevels(data.items);
          }
        }
      } catch (err: any) {
        console.error('Network error fetching videos:', err);
        setVideosError(err.message || 'Network error while fetching videos');
        setRecentVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };

    // Add a small delay when YouTube is connected to ensure proper setup
    if (ytChannel) {
      const timer = setTimeout(() => {
    fetchRecentVideos();
      }, 1500); // 1.5 second delay
      return () => clearTimeout(timer);
    }
  }, [ytChannel, session?.user?.id]);

  // Fetch risk levels for videos
  const fetchRiskLevels = async (videos: any[]) => {
    try {
      const videoIds = videos.map(video => video.id.videoId || video.id);
      const response = await fetch('/api/get-risk-levels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setVideoRiskLevels(data.riskLevels || {});
      } else {
        console.warn('Failed to fetch risk levels');
      }
    } catch (err) {
      console.error('Error fetching risk levels:', err);
    }
  };

  // Get risk badge color
  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel?.toUpperCase()) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  // Get risk badge text
  const getRiskBadgeText = (videoId: string) => {
    const riskData = videoRiskLevels[videoId];
    if (!riskData) {
      return 'NO RISK SCORE';
    }
    return `${riskData.riskLevel} RISK`;
  };

  // Handle viewing reports for a video
  const handleViewReports = (videoId: string, videoTitle: string) => {
    setSelectedVideoForReports({ id: videoId, title: videoTitle });
    setReportsModalOpen(true);
  };

  // Fetch revenue at risk data
  useEffect(() => {
    const fetchRevenue = async () => {
      setRevenueLoading(true);
      setRevenueError(null);
      try {
        const res = await fetch('/api/revenue-at-risk');
        if (!res.ok) throw new Error('Failed to fetch revenue at risk');
        const data = await res.json();
        setRevenueData(data);
      } catch (err: any) {
        setRevenueError(err.message || 'Failed to fetch revenue at risk');
      } finally {
        setRevenueLoading(false);
      }
    };

    // If YouTube is connected, add a small delay to ensure Firestore data is propagated
    if (ytChannel) {
      const timer = setTimeout(() => {
        fetchRevenue();
      }, 1000); // 1 second delay
      return () => clearTimeout(timer);
    } else {
      // If no YouTube channel, fetch immediately (will show setup required or error)
    fetchRevenue();
    }
  }, [ytChannel]);

  const handleCPMSetupComplete = () => {
    // Refresh revenue data after CPM setup
    const fetchRevenue = async () => {
      setRevenueLoading(true);
      setRevenueError(null);
      try {
        const res = await fetch('/api/revenue-at-risk');
        if (!res.ok) throw new Error('Failed to fetch revenue at risk');
        const data = await res.json();
        setRevenueData(data);
      } catch (err: any) {
        setRevenueError(err.message || 'Failed to fetch revenue at risk');
      } finally {
        setRevenueLoading(false);
      }
    };
    fetchRevenue();
  };

  // Show welcome modal on first connection
  useEffect(() => {
    console.log('Welcome modal trigger check:', {
      hasChannelContext: !!channelContext,
      hasChannelData: !!channelContext?.channelData,
      hasYtChannel: !!ytChannel,
      sessionStorageShown: window.sessionStorage.getItem('ytWelcomeModalShown'),
      channelContext: channelContext
    });
    
    // Show modal if we have either channel context OR YouTube channel data, and haven't shown it before
    const shouldShowModal = (channelContext?.channelData || ytChannel) && !window.sessionStorage.getItem('ytWelcomeModalShown');
    
    if (shouldShowModal) {
      console.log('Triggering welcome modal');
      setShowWelcomeModal(true);
      window.sessionStorage.setItem('ytWelcomeModalShown', '1');
    }
  }, [channelContext, ytChannel]);

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
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 bg-risk/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-risk" />
          </div>
          <p className="text-risk font-medium mb-2">Error</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
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
            subscriberCount: channelContext?.channelData?.subscriberCount || 0,
            viewCount: channelContext?.channelData?.viewCount || 0,
            videoCount: channelContext?.channelData?.videoCount || 0
          }
        }}
        onClose={() => setShowWelcomeModal(false)}
      />
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-title font-semibold text-gray-800">My Dashboard</h1>
          <div className="flex items-center gap-3">
            {!ytChannel ? (
              <Button 
                size="sm" 
                disabled={ytFetching} 
                onClick={async () => {
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
                        setYtChannel(data.channel);
                        console.log('YouTube connection response:', data);
                        if (data.channelContext) {
                          console.log('Setting channel context:', data.channelContext);
                          setChannelContext(data.channelContext);
                        } else {
                          console.log('No channel context in response');
                        }
                      } else {
                      const errorData = await response.json();
                      console.error('Failed to connect YouTube:', errorData.error);
                      alert('Failed to connect YouTube channel. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error connecting YouTube:', error);
                    alert('Failed to connect YouTube channel. Please try again.');
                  } finally {
                    setYtFetching(false);
                  }
                }}
              >
                {ytFetching ? 'Connecting...' : 'Connect YouTube'}
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-safe font-medium text-sm">
                  <CheckCircle className="w-4 h-4" />
                  YouTube Connected
                </span>
                {channelContext && (
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      channelContext.aiIndicators?.aiProbability > 70 ? 'bg-red-500' : 
                      channelContext.aiIndicators?.aiProbability > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-xs text-gray-600">
                      AI Detection: {channelContext.aiIndicators?.aiProbability || 0}% confidence
                    </span>
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button className="text-xs text-gray-400 hover:text-gray-600">
                            ℹ️
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                            sideOffset={5}
                          >
                            <div className="flex flex-col gap-1">
                              <span><strong>AI Detection Score:</strong> {channelContext.aiIndicators?.aiProbability || 0}%</span>
                              <span><strong>Confidence:</strong> {channelContext.aiIndicators?.confidence || 0}%</span>
                              <span><strong>Channel Age:</strong> {channelContext.channelData?.accountDate ? 
                                ((new Date().getTime() - new Date(channelContext.channelData.accountDate).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1) : 'Unknown'} years</span>
                              <span><strong>Videos:</strong> {channelContext.channelData?.videoCount || 0}</span>
                              <span><strong>Subscribers:</strong> {channelContext.channelData?.subscriberCount?.toLocaleString() || 0}</span>
                              <span className="text-xs text-gray-300 mt-1">
                                Lower scores indicate more human-like content patterns
                              </span>
                            </div>
                            <Tooltip.Arrow className="fill-gray-900" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          <Button 
            size="sm" 
            variant="outlined"
            onClick={() => router.push('/scan-history')}
          >
            Scan Results
          </Button>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div>
                  <Button
                    size="sm"
                    variant="outlined"
                    className={`flex items-center gap-2 ${!canBatchScan ? 'opacity-50 cursor-not-allowed bg-gray-100 hover:bg-gray-100 text-gray-600' : ''}`}
                    onClick={canBatchScan ? () => {/* TODO: Implement batch scan handler */} : undefined}
                    disabled={!canBatchScan}
                  >
                    {!canBatchScan ? <Lock className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                    Scan All Videos
                  </Button>
                </div>
              </Tooltip.Trigger>
              {!canBatchScan && (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                    sideOffset={5}
                  >
                    <div className="flex flex-col gap-1">
                      <span>Batch analysis is only available for Advanced Members.</span>
                      <span>Please visit <Link href="/pricing" className="text-yellow-400 hover:text-yellow-300 underline">Pricing</Link> page to upgrade your plan.</span>
                    </div>
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              )}
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Revenue at Risk Card */}
          <Card className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-title font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-yellow-500" />
                Revenue at Risk
              </h2>
              {revenueData && !revenueData.setupRequired && (
                <button
                  onClick={() => setCpmSetupModalOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Edit CPM Settings"
                  title="Edit CPM Settings"
                >
                  <Settings className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>
            
            <div>
              {revenueLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading revenue data...</p>
                  </div>
                </div>
              ) : !ytChannel ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-subtitle font-semibold text-gray-800 mb-2">Connect YouTube to Calculate Revenue at Risk</h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    The Revenue at Risk calculator helps you estimate how much of your YouTube earnings could be at risk due to TOS violations. Connect your YouTube channel to unlock this feature and get personalized insights.
                  </p>
                  {/* Connect YouTube button removed as it is now only in the top right */}
                </div>
              ) : (ytChannel && revenueError) ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-risk/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="h-8 w-8 text-risk" />
                  </div>
                  <p className="text-risk font-medium mb-2">Failed to load revenue data</p>
                  <p className="text-gray-600 mb-6">{revenueError}</p>
                  <Button onClick={() => {
                    setRevenueError(null);
                    const fetchRevenue = async () => {
                      setRevenueLoading(true);
                      setRevenueError(null);
                      try {
                        const res = await fetch('/api/revenue-at-risk');
                        if (!res.ok) throw new Error('Failed to fetch revenue at risk');
                        const data = await res.json();
                        setRevenueData(data);
                      } catch (err: any) {
                        setRevenueError(err.message || 'Failed to fetch revenue at risk');
                      } finally {
                        setRevenueLoading(false);
                      }
                    };
                    fetchRevenue();
                  }}>
                    Retry
                  </Button>
                </div>
              ) : revenueData?.setupRequired ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="h-8 w-8 text-yellow-600" />
                  </div>
                  <h3 className="text-subtitle font-semibold text-gray-800 mb-2">Setup Revenue Calculator</h3>
                  <p className="text-gray-600 mb-6 max-w-md">
                    Configure your CPM to get accurate revenue estimates and see exactly how much of your earnings are at risk from TOS violations.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-safe/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <DollarSign className="h-6 w-6 text-safe" />
                      </div>
                      <h4 className="font-medium text-gray-800 text-sm">Accurate Revenue</h4>
                      <p className="text-xs text-gray-600">Based on your actual CPM</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <TrendingUp className="h-6 w-6 text-yellow-600" />
                      </div>
                      <h4 className="font-medium text-gray-800 text-sm">Risk Assessment</h4>
                      <p className="text-xs text-gray-600">See revenue at risk</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Shield className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-gray-800 text-sm">Protect Earnings</h4>
                      <p className="text-xs text-gray-600">Fix issues early</p>
                    </div>
                  </div>
                  <Button onClick={() => setCpmSetupModalOpen(true)}>
                    Setup Revenue Calculator
                  </Button>
                </div>
              ) : revenueData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-risk/5 rounded-lg border border-risk/20">
                      <div className="text-caption text-gray-600 mb-1">At Risk</div>
                      <div className="text-title font-bold text-risk">${revenueData.atRisk.toLocaleString()}</div>
                    </div>
                    <div className="text-center p-3 bg-safe/5 rounded-lg border border-safe/20">
                      <div className="text-caption text-gray-600 mb-1">Secured</div>
                      <div className="text-title font-bold text-safe">${revenueData.secured.toLocaleString()}</div>
                    </div>
                    <div className="text-center p-3 bg-gray-100 rounded-lg border border-gray-200">
                      <div className="text-caption text-gray-600 mb-1">Total</div>
                      <div className="text-title font-bold text-gray-800">${revenueData.total.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-safe transition-all duration-500"
                        style={{ width: `${revenueData.total > 0 ? (revenueData.secured / revenueData.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="text-right text-caption text-gray-500">
                      {revenueData.total > 0 ? Math.round((revenueData.secured / revenueData.total) * 100) : 0}% Secured
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-800">Top 5 Videos</h4>
                    <div className="space-y-2">
                      {revenueData.details.slice(0, 5).map((video) => (
                        <div key={video.videoId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 truncate text-sm">{video.title}</div>
                            <div className="text-xs text-gray-500">
                              ${video.earnings.toLocaleString()} | {video.viewCount.toLocaleString()} views | {typeof video.rpm === 'number' && !isNaN(video.rpm) ? `RPM: $${video.rpm.toFixed(2)}` : `CPM: $${video.cpm?.toFixed(2) ?? '--'}`}
                            </div>
                          </div>
                          <span
                            className={`ml-3 px-2 py-1 rounded-full text-xs font-semibold ${
                              video.riskLevel === 'LOW' 
                                ? 'bg-safe text-white' 
                                : 'bg-risk text-white'
                            }`}
                          >
                            {video.riskLevel === 'LOW' ? 'Secured' : 'At Risk'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Recent Videos Card */}
          {ytChannel && (
            <Card className="flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title font-semibold text-gray-800 flex items-center gap-2">
                  <Video className="w-6 h-6 text-yellow-500" />
                  Recent Videos
                </h2>
                <Link href="/my-videos">
                  <Button variant="outlined" size="sm">View All</Button>
                </Link>
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
                      setVideosError(null);
                      // Trigger a refetch
                      const fetchRecentVideos = async () => {
                        if (!ytChannel || !session?.user?.id) return;
                        setVideosLoading(true);
                        setVideosError(null);
                        try {
                          const response = await fetch('/api/fetch-youtube-videos', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pageSize: 5 }),
                          });
                          
                          if (!response.ok) {
                            let errorData;
                            try {
                              errorData = await response.json();
                            } catch (parseError) {
                              console.error('Failed to parse error response:', parseError);
                              errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                            }
                            console.error('Videos API error:', errorData);
                            const errorMessage = errorData.error || errorData.details || `Failed to fetch videos (${response.status})`;
                            setVideosError(errorMessage);
                            setRecentVideos([]);
                          } else {
                            const data = await response.json();
                            setRecentVideos(data.items || []);
                            if (data.items && data.items.length > 0) {
                              await fetchRiskLevels(data.items);
                            }
                          }
                        } catch (err: any) {
                          setVideosError(err.message || 'Network error while fetching videos');
                          setRecentVideos([]);
                        } finally {
                          setVideosLoading(false);
                        }
                      };
                      fetchRecentVideos();
                    }}>
                      Retry
                    </Button>
                  </div>
                ) : recentVideos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {recentVideos.slice(0, 4).map((video) => {
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
                            <div className="font-semibold text-sm text-gray-800 line-clamp-2">{video.snippet?.title}</div>
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
                                  onClick={() => handleViewReports(videoId, video.snippet.title)}
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
          )}
        </div>
      </div>

      {/* Video Reports Modal */}
      {selectedVideoForReports && (
        <VideoReportsModal
          isOpen={reportsModalOpen}
          onClose={() => {
            setReportsModalOpen(false);
            setSelectedVideoForReports(null);
          }}
          videoId={selectedVideoForReports.id}
          videoTitle={selectedVideoForReports.title}
        />
      )}
      
      {/* CPM Setup Modal */}
      <CPMSetupModal
        isOpen={cpmSetupModalOpen}
        onClose={() => setCpmSetupModalOpen(false)}
        onSetupComplete={handleCPMSetupComplete}
      />
    </main>
  );
} 
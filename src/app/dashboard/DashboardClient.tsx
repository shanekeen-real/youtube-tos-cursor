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
import { Calendar, TrendingUp, Users, Video, AlertTriangle, CheckCircle, Clock, Calculator, DollarSign, Shield, Settings } from 'lucide-react';
import VideoReportsModal from '@/components/VideoReportsModal';
import CPMSetupModal from '@/components/CPMSetupModal';

// Define the structure of a user's profile data
interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro';
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
        } else {
          // User exists in Auth, but not in Firestore. Let's create their profile.
          console.log("User profile not found, creating one on the fly...");
          const newUserProfile: UserProfile = {
            email: session.user.email!,
            createdAt: new Date().toISOString(),
            scanCount: 0,
            scanLimit: 3,
            subscriptionTier: 'free',
          };
          await setDoc(userRef, newUserProfile);
          setUserProfile(newUserProfile);
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
        } else {
          // No channel data found, set to null (don't auto-reconnect)
            setYtChannel(null);
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

  if (status === 'loading' || loading) {
    return (
      <div className="text-center py-10">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">Please sign in to view your dashboard.</p>
        <Button onClick={() => router.push('/')}>Sign In</Button>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <main className="w-full px-[60px] py-4 max-w-none flex flex-col items-stretch justify-start">
      <h1 className="text-2xl font-bold text-[#212121] mb-4">My Dashboard</h1>
      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <Button className="py-2 px-4 text-sm" onClick={() => router.push('/scan-history')}>
          Scan Results
        </Button>
        <Button className="py-2 px-4 text-sm" onClick={/* TODO: Implement batch scan handler */() => {}}>
          Scan All Videos
        </Button>
        {!ytChannel ? (
          <Button className="py-2 px-4 text-sm" disabled={ytFetching} onClick={async () => {
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
          }}>
            {ytFetching ? 'Connecting...' : 'Connect YouTube'}
          </Button>
        ) : (
          <span className="flex items-center gap-2 text-green-600 font-medium text-sm">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5c-3.59 0-6.5-2.91-6.5-6.5S6.41 3.5 10 3.5 16.5 6.41 16.5 10 13.59 16.5 10 16.5zm-1-4.5l5-5-1.41-1.41L9 9.67 7.41 8.09 6 9.5l3 3z"/></svg>
            YouTube Connected
          </span>
        )}
          </div>
      <div className="w-full border-b border-gray-200 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 mt-4">
      {/* Revenue at Risk Card */}
        <Card className="relative p-4 h-[624px]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span>Revenue at Risk</span>
          </h2>
            {revenueData && !revenueData.setupRequired && (
          <button
            onClick={() => setCpmSetupModalOpen(true)}
            className="p-2 rounded hover:bg-gray-100 transition"
            aria-label="Edit CPM Settings"
            title="Edit CPM Settings"
          >
            <Settings className="h-5 w-5 text-gray-500" />
          </button>
            )}
        </div>
        {revenueLoading ? (
          <div>Loading revenue data...</div>
          ) : !ytChannel ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-700">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect YouTube to Calculate Revenue at Risk</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                The Revenue at Risk calculator helps you estimate how much of your YouTube earnings could be at risk due to TOS violations. Connect your YouTube channel to unlock this feature and get personalized insights.
              </p>
              <Button className="mt-2" disabled={ytFetching} onClick={async () => {
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
              }}>
                {ytFetching ? 'Connecting...' : 'Connect YouTube'}
              </Button>
            </div>
          ) : (ytChannel && revenueError) ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-2">Failed to load revenue data</div>
              <div className="text-sm text-gray-600 mb-4">{revenueError}</div>
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
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calculator className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup Revenue Calculator</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Configure your CPM to get accurate revenue estimates and see exactly how much of your earnings are at risk from TOS violations.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 text-sm">Accurate Revenue</h4>
                <p className="text-xs text-gray-600">Based on your actual CPM</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 text-sm">Risk Assessment</h4>
                <p className="text-xs text-gray-600">See revenue at risk</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 text-sm">Protect Earnings</h4>
                <p className="text-xs text-gray-600">Fix issues early</p>
              </div>
            </div>
            <Button onClick={() => setCpmSetupModalOpen(true)}>
              Setup Revenue Calculator
            </Button>
          </div>
        ) : revenueData ? (
          <>
            <div className="flex flex-wrap gap-8 mb-4">
              <div>
                <div className="text-lg text-gray-600">At Risk</div>
                <div className="text-2xl font-bold text-red-600">${revenueData.atRisk.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-lg text-gray-600">Secured</div>
                <div className="text-2xl font-bold text-green-600">${revenueData.secured.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-lg text-gray-600">Total</div>
                <div className="text-2xl font-bold">${revenueData.total.toLocaleString()}</div>
              </div>
            </div>
            <div className="w-full h-4 bg-gray-200 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${revenueData.total > 0 ? (revenueData.secured / revenueData.total) * 100 : 0}%` }}
              />
            </div>
            <div className="text-right text-sm text-gray-500 mb-2">
              {revenueData.total > 0 ? Math.round((revenueData.secured / revenueData.total) * 100) : 0}% Secured
            </div>
            <div className="mt-2">
              <div className="font-semibold mb-1">Top 5 Videos</div>
              <div className="divide-y divide-gray-200">
                {revenueData.details.slice(0, 5).map((video) => (
                  <div key={video.videoId} className="flex items-center justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 truncate">{video.title}</div>
                      <div className="text-xs text-gray-500">
                        ${video.earnings.toLocaleString()} | {video.viewCount.toLocaleString()} views | {typeof video.rpm === 'number' && !isNaN(video.rpm) ? `RPM: $${video.rpm.toFixed(2)}` : `CPM: $${video.cpm?.toFixed(2) ?? '--'}`}
                      </div>
                    </div>
                    <span
                      className={`ml-4 px-2 py-1 rounded text-xs font-bold ${video.riskLevel === 'LOW' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {video.riskLevel === 'LOW' ? 'Secured' : 'At Risk'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </Card>
        {/* Recent Videos Card */}
      {ytChannel && (
          <Card className="p-4 h-[624px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Videos</h2>
            <Link href="/my-videos">
              <Button variant="outlined">View All</Button>
            </Link>
          </div>
          {videosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 h-32 rounded mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded mb-1"></div>
                  <div className="bg-gray-200 h-3 rounded w-2/3"></div>
                </div>
              ))}
            </div>
            ) : videosError ? (
              <div className="text-center py-8">
                <div className="text-red-500 mb-2">Failed to load videos</div>
                <div className="text-sm text-gray-600 mb-4">{videosError}</div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentVideos.slice(0, 5).map((video) => {
                const videoId = video.id.videoId;
                const riskData = videoRiskLevels[videoId];
                const riskBadgeColor = riskData 
                  ? riskData.riskLevel === 'HIGH' 
                    ? 'bg-red-100 text-red-800 border-red-200' 
                    : riskData.riskLevel === 'MEDIUM' 
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                      : 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200';
                const riskBadgeText = riskData ? `${riskData.riskLevel} Risk` : 'NO RISK SCORE';

                return (
                  <div key={videoId} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    <img 
                      src={video.snippet.thumbnails.medium.url} 
                      alt={video.snippet.title}
                        className="w-full h-24 object-cover mb-2 rounded"
                      loading="lazy"
                    />
                      <div className="p-2 flex flex-col gap-3">
                        <div className="font-semibold text-sm truncate mb-0">{video.snippet?.title}</div>
                        <div className="flex items-center gap-2 mb-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${riskBadgeColor}`}>{riskBadgeText}</span>
                      </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-0">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(video.snippet.publishedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => { 
                            const url = `https://www.youtube.com/watch?v=${videoId}`;
                            router.push(`/results?url=${encodeURIComponent(url)}`);
                          }}
                            className="flex-1 py-1 px-2 text-xs"
                        >
                          {riskData ? 'Re-analyze' : 'Analyze'}
                        </Button>
                        {riskData && (
                          <Button 
                            variant="outlined" 
                            onClick={() => handleViewReports(videoId, video.snippet.title)}
                              className="py-1 px-2 text-xs"
                          >
                            View Reports
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Videos Found</h3>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
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
        </Card>
      )}
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
"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';
import ConnectYouTubeButton from '@/components/ConnectYouTubeButton';
import { format } from 'date-fns';

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
          // No channel data found, try to fetch it from YouTube API
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
              console.log('No YouTube channel found or error:', errorData.error);
              setYtChannel(null);
            }
          } catch (error) {
            console.error('Error fetching YouTube channel:', error);
            setYtChannel(null);
          } finally {
            setYtFetching(false);
          }
        }
      } catch {
        setYtChannel(null);
      } finally {
        setYtLoading(false);
      }
    };
    fetchYouTube();
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
          const errorData = await response.json();
          console.error('Videos API error:', errorData);
          setVideosError(errorData.error || `Failed to fetch videos (${response.status})`);
          setRecentVideos([]);
        } else {
          const data = await response.json();
          console.log('Successfully fetched videos:', data.items?.length || 0);
          setRecentVideos(data.items || []);
        }
      } catch (err: any) {
        console.error('Network error fetching videos:', err);
        setVideosError(err.message || 'Network error while fetching videos');
        setRecentVideos([]);
      } finally {
        setVideosLoading(false);
      }
    };
    fetchRecentVideos();
  }, [ytChannel, session?.user?.id]);

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
    <main className="min-h-screen w-full max-w-4xl mx-auto px-4 py-8 relative">
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'linear-gradient(90deg, #ff0080, #7928ca, #007cf0, #00dfd8, #ff0080)', opacity: 0.95}}>
          <div className="bg-white rounded-xl shadow-lg p-10 flex flex-col items-center animate-bounceIn">
            <h2 className="text-4xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500">Welcome to Pro!</h2>
            <p className="text-lg font-semibold mb-4 text-gray-800">You have unlocked unlimited scans and all Pro features.</p>
            <Button variant="primary" onClick={() => setShowCelebration(false)}>Awesome!</Button>
          </div>
        </div>
      )}
      <h1 className="text-3xl font-bold text-[#212121] mb-6">My Dashboard</h1>
      {/* YouTube Channel Integration Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-2">YouTube Channel Integration</h2>
        {ytLoading ? (
          <div>Loading channel info...</div>
        ) : ytFetching ? (
          <div>Connecting to YouTube...</div>
        ) : ytChannel ? (
          <div className="mt-4 p-4 bg-gray-50 border rounded">
            <h3 className="text-xl font-semibold mb-2">Connected Channel:</h3>
            <div className="flex items-center gap-4">
              {ytChannel.snippet?.thumbnails?.default?.url && (
                <img src={ytChannel.snippet.thumbnails.default.url} alt="Channel" className="w-16 h-16 rounded-full" />
              )}
              <div>
                <div className="font-bold text-lg">{ytChannel.snippet?.title}</div>
                <div className="text-gray-600">{ytChannel.snippet?.customUrl}</div>
                <div className="text-gray-600">Subscribers: {ytChannel.statistics?.subscriberCount}</div>
                <div className="text-gray-600">Total Views: {ytChannel.statistics?.viewCount}</div>
                <div className="text-gray-600">Videos: {ytChannel.statistics?.videoCount}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-gray-600 mb-4">Connect your YouTube channel to analyze your own videos for TOS compliance.</p>
            <ConnectYouTubeButton />
          </div>
        )}
      </section>
      {/* Recent Videos Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Recent Videos</h2>
          <Link href="/my-videos">
            <Button variant="secondary">View All</Button>
          </Link>
        </div>
        {videosLoading ? (
          <div>Loading recent videos...</div>
        ) : videosError ? (
          <div className="text-red-500">{videosError}</div>
        ) : recentVideos.length === 0 ? (
          <div>No recent videos found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentVideos.map((video) => (
              <Card key={video.id.videoId || video.id} className="flex flex-col">
                <div className="flex items-center gap-4">
                  {video.snippet?.thumbnails?.medium?.url && (
                    <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} className="w-24 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1 truncate">{video.snippet?.title}</div>
                    <div className="text-xs text-gray-500 mb-1">{video.snippet?.publishedAt ? format(new Date(video.snippet.publishedAt), 'PPP') : ''}</div>
                    {/* Enhanced statistics display */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {video.statistics?.viewCount && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {parseInt(video.statistics.viewCount).toLocaleString()}
                        </span>
                      )}
                      {video.statistics?.likeCount && (
                        <span className="flex items-center gap-1 text-green-600">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          {parseInt(video.statistics.likeCount).toLocaleString()}
                        </span>
                      )}
                      {video.statistics?.dislikeCount && (
                        <span className="flex items-center gap-1 text-red-600">
                          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                          </svg>
                          {parseInt(video.statistics.dislikeCount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex justify-end">
                  <Button onClick={() => { /* TODO: trigger analysis for video.id.videoId */ }}>
                    Scan/Analyze
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
      {userProfile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <h2 className="text-xl font-semibold mb-2">My Subscription</h2>
                <p className="capitalize text-4xl font-bold mb-4" style={userProfile.subscriptionTier === 'pro' ? {background: 'linear-gradient(90deg, #ff0080, #7928ca, #007cf0, #00dfd8, #ff0080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'} : {color: '#2563eb'}}>{userProfile.subscriptionTier}</p>
                {userProfile.subscriptionTier === 'free' ? (
                    <Button variant="primary" onClick={handleUpgradeClick}>Upgrade to Pro</Button>
                ) : (
                    <p className="text-gray-500 font-semibold">You have unlimited scans.</p>
                )}
            </Card>
            <Card>
                 <h2 className="text-xl font-semibold mb-2">Usage</h2>
                 <p className="text-gray-600">
                    You have used <span className="font-bold text-black">{userProfile.scanCount}</span> of your <span className="font-bold text-black">{userProfile.scanLimit}</span> {userProfile.subscriptionTier === 'pro' ? 'scans (unlimited)' : 'free scans'} this month.
                 </p>
                 <div className="w-full h-4 bg-gray-200 rounded-full mt-4 overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                 </div>
                 <div className="text-right text-sm text-gray-500 mt-1">{Math.round(progress)}%</div>
            </Card>
            <Card>
                <h2 className="text-xl font-semibold mb-2">Account Details</h2>
                <p><strong>Email:</strong> {userProfile.email}</p>
                <p><strong>Member Since:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
                 <Link href="/scan-history">
                    <Button variant="secondary" className="mt-4">View Scan History</Button>
                 </Link>
            </Card>
        </div>
      )}
    </main>
  );
} 
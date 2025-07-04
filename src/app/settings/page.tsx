"use client";
import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useSession } from 'next-auth/react';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import Link from 'next/link';
import { getTierLimits } from '@/types/subscription';

// Define the structure of a user's profile data
interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
  subscriptionData?: {
    renewalDate?: string;
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

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-md bg-white flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-[#212121]">Dark Mode</span>
            <Button variant={dark ? 'blue' : 'outlined'} onClick={() => setDark((d) => !d)}>
              {dark ? 'On' : 'Off'}
            </Button>
          </div>
          <div className="text-[#606060] text-sm">More settings coming soon...</div>
        </Card>
        {/* Usage Card */}
        {userProfile && (
          <Card>
            <h2 className="text-xl font-semibold mb-2">Usage</h2>
            {(() => {
              const tierLimits = getTierLimits(userProfile.subscriptionTier);
              const displayLimit = tierLimits.scanLimit === 'unlimited' ? 'unlimited' : tierLimits.scanLimit;
              return (
                <p className="text-gray-600">
                  You have used <span className="font-bold text-black">{userProfile.scanCount}</span> of your <span className="font-bold text-black">{displayLimit}</span> scans this month.
                </p>
              );
            })()}
            <div className="w-full h-4 bg-gray-200 rounded-full mt-4 overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-right text-sm text-gray-500 mt-1">{Math.round(progress)}%</div>
          </Card>
        )}
        {/* Account Details Card */}
        {userProfile && (
          <Card>
            <h2 className="text-xl font-semibold mb-2">Account Details</h2>
            <p><strong>Email:</strong> {userProfile.email}</p>
            <p><strong>Member Since:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
          </Card>
        )}
        {/* My Subscription Card */}
        {userProfile && (
          <Card>
            <h2 className="text-xl font-semibold mb-2">My Subscription</h2>
            <p className="capitalize text-4xl font-bold mb-4" style={
              userProfile.subscriptionTier === 'pro' || userProfile.subscriptionTier === 'advanced' || userProfile.subscriptionTier === 'enterprise' 
                ? {background: 'linear-gradient(90deg, #ff0080, #7928ca, #007cf0, #00dfd8, #ff0080)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'} 
                : {color: '#2563eb'}
            }>{userProfile.subscriptionTier}</p>
            <div className="space-y-2">
              {userProfile.subscriptionData?.renewalDate && (
                <p className="text-gray-500 font-semibold">
                  Your plan will auto-renew on {new Date(userProfile.subscriptionData.renewalDate).toLocaleDateString()}.
                </p>
              )}
              <button
                className="w-full py-2 px-4 rounded font-semibold bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => window.location.href = '/pricing'}
              >
                Upgrade Plan
              </button>
            </div>
          </Card>
        )}
        {/* YouTube Channel Integration Card */}
        <Card>
          <h2 className="text-2xl font-bold mb-2">YouTube Channel Integration</h2>
          {ytChannel ? (
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
              <Button variant="primary" className="mt-6 bg-red-600 hover:bg-red-700 text-white" onClick={handleUnlinkYouTube}>
                Unlink YouTube
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-gray-600 mb-4">Connect your YouTube channel to analyze your own videos for TOS compliance.</p>
              <Button disabled={ytConnecting} onClick={handleConnectYouTube}>
                {ytConnecting ? 'Connecting...' : 'Connect YouTube'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
} 
"use client";
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/components/ClientLayout';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import axios from 'axios';

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
  const authContext = useContext(AuthContext);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
      if (!authContext?.user) {
        setLoading(false);
        // This will be handled by the main loading/error/auth checks below
        return;
      }

      try {
        const db = getFirestore(app);
        const userRef = doc(db, 'users', authContext.user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // User exists in Auth, but not in Firestore. Let's create their profile.
          console.log("User profile not found, creating one on the fly...");
          const newUserProfile: UserProfile = {
            email: authContext.user.email!,
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
  }, [authContext?.user]);
  
  const handleUpgradeClick = async () => {
    if (!authContext?.user) {
        alert("Please sign in to upgrade.");
        return;
    }
    try {
        const { data } = await axios.post('/api/create-checkout-session', {
            userId: authContext.user.uid
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

  if (loading) {
    return (
      <div className="text-center py-10">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!authContext?.user) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">Please sign in to view your dashboard.</p>
        <Button onClick={() => authContext?.setAuthOpen(true)}>Sign In</Button>
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
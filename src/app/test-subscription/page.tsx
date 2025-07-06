"use client";
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function TestSubscriptionPage() {
  const { data: session } = useSession();
  const [statusData, setStatusData] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/test-subscription-status');
      const data = await response.json();
      setStatusData(data);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncSubscription = async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/sync-subscription', {
        method: 'POST',
      });
      const data = await response.json();
      setSyncResult(data);
      
      // Refresh status after sync
      setTimeout(checkStatus, 1000);
    } catch (error) {
      console.error('Error syncing subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to test subscription</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Subscription Debug Tools</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Check Current Status</h2>
            <p className="text-gray-600 mb-4">
              Check the current subscription status in both Firestore and Stripe.
            </p>
            <button
              onClick={checkStatus}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Manual Sync</h2>
            <p className="text-gray-600 mb-4">
              Force sync subscription data from Stripe to Firestore.
            </p>
            <button
              onClick={syncSubscription}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Syncing...' : 'Sync Subscription'}
            </button>
          </div>
        </div>

        {statusData && (
          <div className="bg-white border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Firestore Data</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(statusData.firestore, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Stripe Data</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(statusData.stripe, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {syncResult && (
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Sync Result</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(syncResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 
"use client";
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TestSessionPage() {
  const { data: session, status } = useSession();
  const [envCheck, setEnvCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkEnvironment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/env-check');
      const data = await response.json();
      setEnvCheck(data);
    } catch (error) {
      console.error('Error checking environment:', error);
      setEnvCheck({ error: 'Failed to check environment' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Session & Environment Test</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Has Session:</strong> {session ? 'Yes' : 'No'}</p>
            {session && (
              <>
                <p><strong>User ID:</strong> {session.user?.id || 'Not set'}</p>
                <p><strong>Email:</strong> {session.user?.email || 'Not set'}</p>
                <p><strong>Name:</strong> {session.user?.name || 'Not set'}</p>
                <p><strong>Has Access Token:</strong> {session.accessToken ? 'Yes' : 'No'}</p>
                <p><strong>Has Refresh Token:</strong> {session.refreshToken ? 'Yes' : 'No'}</p>
                <p><strong>Expires At:</strong> {session.expiresAt ? new Date(session.expiresAt * 1000).toLocaleString() : 'Not set'}</p>
              </>
            )}
          </div>
          {session && (
            <div className="mt-4">
              <button 
                onClick={handleSignOut}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Sign Out & Re-authenticate
              </button>
              <p className="text-sm text-gray-600 mt-2">
                This will force you to sign in again and get fresh tokens
              </p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <button 
            onClick={checkEnvironment}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Environment Variables'}
          </button>
          
          {envCheck && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Environment Variables:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(envCheck, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test YouTube API</h2>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/fetch-youtube-videos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pageSize: 1 }),
                });
                const data = await response.json();
                console.log('YouTube API test result:', data);
                alert(`Response: ${response.status} - ${data.error || 'Success'}`);
              } catch (error) {
                console.error('YouTube API test error:', error);
                alert('Network error');
              }
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
          >
            Test YouTube Videos API
          </button>
          
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/test-youtube-api');
                const data = await response.json();
                console.log('Comprehensive YouTube API test result:', data);
                
                const summary = data.summary;
                alert(`Comprehensive Test Results:\n` +
                      `Channels: ${summary.channelsFound}\n` +
                      `Mine Videos: ${summary.mineVideosFound}\n` +
                      `ForMine Videos: ${summary.forMineVideosFound}\n` +
                      `Channel Videos: ${summary.channelVideosFound}\n\n` +
                      `Check console for full details.`);
              } catch (error) {
                console.error('Comprehensive YouTube API test error:', error);
                alert('Network error');
              }
            }}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Comprehensive YouTube API Test
          </button>
        </div>
      </div>
    </div>
  );
} 
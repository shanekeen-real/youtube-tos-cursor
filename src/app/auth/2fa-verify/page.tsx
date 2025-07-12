"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signOut } from 'next-auth/react';

export default function TwoFactorVerifyPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check if user is signed in and has 2FA enabled
    const checkAuth = async () => {
      const session = await getSession();
      if (!session?.user?.id) {
        router.push('/auth/signin');
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || '');

      // Check if user has 2FA enabled
      try {
        const response = await fetch('/api/check-2fa-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: session.user.id }),
        });

        if (response.ok) {
          const data = await response.json();
          if (!data.twoFactorEnabled) {
            // User doesn't have 2FA enabled, redirect to dashboard
            router.push('/dashboard');
          }
        } else {
          // Error checking 2FA status, redirect to sign in
          router.push('/auth/signin');
        }
      } catch (error) {
        console.error('Error checking 2FA status:', error);
        router.push('/auth/signin');
      }
    };

    checkAuth();
  }, [router]);

  const handleVerify = async () => {
    if (!token.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-2fa-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, token: token.trim() }),
      });

      if (response.ok) {
        // 2FA verification successful, redirect to dashboard
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Error during verification:', error);
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">2FA Verification</h1>
        <p className="mb-4">Enter your 6-digit verification code:</p>
        
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 text-center text-xl font-mono"
          maxLength={6}
          autoFocus
        />
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <button
          onClick={handleVerify}
          disabled={loading || token.length !== 6}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        
        <button
          onClick={handleSignOut}
          className="w-full mt-2 px-4 py-2 bg-gray-500 text-white rounded-lg"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
} 
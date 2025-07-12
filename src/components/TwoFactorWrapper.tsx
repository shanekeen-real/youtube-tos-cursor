"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface TwoFactorWrapperProps {
  children: React.ReactNode;
}

export default function TwoFactorWrapper({ children }: TwoFactorWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTwoFactor = async () => {
      try {
        console.log('[2FA Wrapper] Session:', session);
        console.log('[2FA Wrapper] Status:', status);
        if (status === 'loading') return;

        if (status === 'unauthenticated') {
          console.log('[2FA Wrapper] Unauthenticated, redirecting to /auth/signin');
          router.push('/auth/signin');
          return;
        }

        if (!session || !session.user) {
          setError('Session or user object is missing.');
          return;
        }

        if (
          session.user.id &&
          session.twoFactorEnabled &&
          !session.twoFactorVerified
        ) {
          console.log('[2FA Wrapper] 2FA enabled but not verified, redirecting to /auth/2fa-verify');
          router.push('/auth/2fa-verify');
          return;
        }

        setIsChecking(false);
      } catch (err) {
        setError('An unexpected error occurred in TwoFactorWrapper.');
        console.error('[2FA Wrapper] Error:', err);
      }
    };

    checkTwoFactor();
  }, [session, status, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full p-8 bg-red-50 border border-red-200 rounded-xl text-center">
          <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <pre className="text-xs text-red-500 bg-red-100 rounded p-2 overflow-x-auto text-left">{JSON.stringify(session, null, 2)}</pre>
        </div>
      </div>
    );
  }

  if (status === 'loading' || isChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-800 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect to sign in
  }

  if (session?.twoFactorEnabled && !session?.twoFactorVerified) {
    return null; // Will redirect to 2FA verification
  }

  return <>{children}</>;
} 
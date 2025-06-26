import React, { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Button from './Button';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (err: any) {
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-black text-xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        {session?.user ? (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-[#212121]">Welcome, {session.user.name || session.user.email}</h2>
            <Button variant="outlined" onClick={handleSignOut} className="mt-4">Sign out</Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-[#212121]">Sign in / Create account</h2>
            <Button variant="blue" onClick={handleGoogleSignIn} className="w-full mb-4" disabled={loading}>
              {loading ? 'Loading...' : 'Sign in with Google'}
            </Button>
            <p className="text-sm text-gray-600 text-center">
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </>
        )}
      </div>
    </div>
  );
} 
import React, { useState, useEffect } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { app } from '../lib/firebase';
import Button from './Button';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
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
        {user ? (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold mb-2 text-[#212121]">Welcome, {user.displayName || user.email}</h2>
            <Button variant="outlined" onClick={handleSignOut} className="mt-4">Sign out</Button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-[#212121]">Sign in / Create account</h2>
            <Button variant="blue" onClick={handleGoogleSignIn} className="w-full mb-4" disabled={loading}>
              {loading ? 'Loading...' : 'Sign in with Google'}
            </Button>
            <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 mb-2">
              <input
                type="email"
                placeholder="Email"
                className="border border-gray-300 rounded-lg p-2 w-full text-[#212121]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="border border-gray-300 rounded-lg p-2 w-full text-[#212121]"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? 'Loading...' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
            <div className="text-xs text-[#606060] text-center mb-2">
              {mode === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button className="underline text-blue-600" onClick={() => setMode('signup')}>Create account</button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button className="underline text-blue-600" onClick={() => setMode('signin')}>Sign in</button>
                </>
              )}
            </div>
            {error && <div className="text-red-600 text-xs text-center mt-2">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
} 
"use client";
import { signIn, getSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#212121] mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your TOS Analyzer account</p>
        </div>
        
        <Button 
          variant="blue" 
          onClick={handleGoogleSignIn} 
          className="w-full mb-4" 
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Sign in with Google'}
        </Button>
        
        <p className="text-sm text-gray-600 text-center">
          By signing in, you agree to our
          <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="mx-1 text-blue-600 hover:underline">Terms of Service</a>
          and
          <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="mx-1 text-blue-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
} 
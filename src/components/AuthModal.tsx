"use client";

import React, { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { Button } from '@/lib/imports';
import { Shield, CheckCircle, LogOut, X, User } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">Yellow Dollar</span>
          </div>
          <button
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {session?.user ? (
            // Signed In State
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                {session.user.image ? (
                  <img 
                    src={session.user.image} 
                    alt={session.user.name || 'User'} 
                    className="w-12 h-12 rounded-xl"
                  />
                ) : (
                  <User className="w-8 h-8 text-yellow-600" />
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome back, {session.user.name || session.user.email}
              </h2>
              <p className="text-gray-600 mb-6">You're signed in to Yellow Dollar</p>
              
              <div className="space-y-3">
                <Button 
                  variant="primary" 
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full h-11"
                >
                  Go to Dashboard
                </Button>
                
                <Button 
                  variant="outlined" 
                  onClick={handleSignOut} 
                  className="w-full h-11"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            // Sign In State
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-yellow-600" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Sign in to Yellow Dollar</h2>
              <p className="text-gray-600 mb-6">Protect your YouTube revenue with AI-powered analysis</p>
              
              <Button 
                variant="primary" 
                onClick={handleGoogleSignIn} 
                className="w-full h-12 text-base font-medium mb-6" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </div>
                )}
              </Button>
              
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Free to start</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <span>Secure & private</span>
                  </div>
                </div>
                
                <p className="text-xs text-gray-500">
                  By signing in, you agree to our{' '}
                  <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-700 underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
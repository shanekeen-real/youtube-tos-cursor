'use client';

import React from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { ArrowLeft, Home, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import Button from './Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-yellow-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="font-semibold">Back to Home</span>
                </Link>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-bold text-xl text-gray-900">Yellow Dollar</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex min-h-[calc(100vh-64px)]">
            {/* Left Side - Illustration */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-500 to-orange-500 p-12 text-white">
              <div className="max-w-md">
                <div className="mb-8">
                  <h2 className="text-4xl font-bold mb-4">Component Error</h2>
                  <p className="text-xl text-red-100">
                    Something went wrong with this component, but don't worry - our team has been notified and your data is safe.
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Error Reported</h3>
                      <p className="text-red-100">This error has been automatically reported to our development team for investigation.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Your Data is Safe</h3>
                      <p className="text-red-100">Your account and analysis data are secure and unaffected by this error.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Error Content */}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-md text-center">
                {/* Mobile Header */}
                <div className="lg:hidden text-center mb-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-2xl text-gray-900">Yellow Dollar</span>
                  </div>
                </div>

                {/* Error Content */}
                <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                  <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                  </div>
                  
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h1>
                  <p className="text-gray-600 mb-8">
                    An error occurred and has been reported to our team. You can try refreshing the page or navigating to a different section.
                  </p>
                  
                  <div className="space-y-4">
                    <Button 
                      onClick={this.resetError}
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    
                    <Button 
                      onClick={() => window.location.reload()}
                      variant="outlined"
                      className="w-full"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Page
                    </Button>
                  </div>
                </div>

                {/* Error Details (Development) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Error Details (Development)</h3>
                    <div className="text-left">
                      <div className="text-xs text-gray-600 mb-2">Error Message:</div>
                      <pre className="text-xs bg-white border border-gray-200 p-3 rounded-lg overflow-auto max-h-32">
                        {this.state.error.toString()}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Helpful Links */}
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-3">
                    <Link 
                      href="/dashboard" 
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">Dashboard</span>
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </Link>
                    
                    <Link 
                      href="/settings" 
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">Settings</span>
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </Link>
                    
                    <Link 
                      href="/" 
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900">Home</span>
                      <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                    </Link>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500">
                    If this error persists, please{' '}
                    <Link href="/" className="text-yellow-600 hover:text-yellow-700 underline font-medium">
                      contact our support team
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
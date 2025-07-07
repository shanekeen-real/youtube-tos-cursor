"use client";

import Link from 'next/link';
import { ArrowLeft, Home, Search, Shield } from 'lucide-react';
import Button from '@/components/Button';

export default function NotFound() {
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
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-500 to-orange-500 p-12 text-white">
          <div className="max-w-md">
            <div className="mb-8">
              <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
              <p className="text-xl text-yellow-100">
                Don't worry! This page might have moved or been removed, but your YouTube revenue protection is still safe with us.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Find What You Need</h3>
                  <p className="text-yellow-100">Use our search or navigation to find the content you're looking for.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Protect Your Revenue</h3>
                  <p className="text-yellow-100">Get back to analyzing your content and protecting your YouTube revenue.</p>
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
                <div className="text-4xl font-bold text-red-500">404</div>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
              <p className="text-gray-600 mb-8">
                Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you entered the wrong URL.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => window.history.back()} 
                  variant="outlined" 
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                
                <Link href="/dashboard">
                  <Button className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* Helpful Links */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Popular Pages</h3>
              <div className="grid grid-cols-1 gap-3">
                <Link 
                  href="/dashboard" 
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">Dashboard</span>
                  <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                </Link>
                
                <Link 
                  href="/pricing" 
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">Pricing</span>
                  <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                </Link>
                
                <Link 
                  href="/settings" 
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-yellow-300 hover:bg-yellow-50 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-900">Settings</span>
                  <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
                </Link>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Still can't find what you're looking for?{' '}
                <Link href="/" className="text-yellow-600 hover:text-yellow-700 underline font-medium">
                  Contact Support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
"use client";
import React, { useState, createContext } from 'react';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';
import Button from './Button';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';

export const AuthContext = createContext<{
  user: any;
  setAuthOpen: (open: boolean) => void;
} | null>(null);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <AuthContext.Provider value={{ user: session?.user || null, setAuthOpen }}>
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <Shield className="w-4 h-4 text-gray-900" />
              </div>
              <span className="font-bold text-xl text-gray-900">Yellow Dollar</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              {status === 'loading' ? (
                <div className="animate-pulse bg-gray-200 h-9 w-20 rounded-xl"></div>
              ) : session?.user ? (
                <UserMenu user={session.user} />
              ) : (
                <>
                  <Link 
                    href="/pricing" 
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Pricing
                  </Link>
                  <Button 
                    variant="outlined" 
                    size="sm"
                    onClick={() => setAuthOpen(true)}
                  >
                    Sign in
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setAuthOpen(true)}
                  >
                    Get started
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={`w-full flex flex-col items-center${pathname === '/dashboard' ? '' : ' pt-8'}`}>
        {children}
      </div>
      
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </AuthContext.Provider>
  );
} 
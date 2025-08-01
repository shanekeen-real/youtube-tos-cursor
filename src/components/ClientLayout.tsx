"use client";
import React, { useState, createContext, useEffect } from 'react';
import { AuthModal } from '@/lib/imports';
import { UserMenu } from '@/lib/imports';
import { Button } from '@/lib/imports';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { FirebaseAuthProvider } from '@/lib/imports';
import { Session } from 'next-auth';
import BetaBanner from './BetaBanner';
import Logo from './Logo';
import { useNotifications } from '@/hooks/useNotifications';

export const AuthContext = createContext<{
  user: Session['user'] | null;
  setAuthOpen: (open: boolean) => void;
} | null>(null);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Smooth scroll to pricing section on landing page
  const handleScrollToPricing = () => {
    const section = document.getElementById('pricing-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <FirebaseAuthProvider>
      <NotificationWrapper>
      <AuthContext.Provider value={{ user: session?.user || null, setAuthOpen }}>
        {/* Beta Banner */}
        <BetaBanner />
        
        {/* Sticky Navbar */}
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-[100px]">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <Logo 
                  size="lg" 
                  className="hidden lg:block transition-transform group-hover:scale-105" 
                />
                <Logo 
                  size="md" 
                  className="hidden sm:block lg:hidden transition-transform group-hover:scale-105" 
                />
                <Logo 
                  size="sm" 
                  className="block sm:hidden transition-transform group-hover:scale-105" 
                />
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-2 sm:gap-4 md:gap-6">
                {status === 'loading' ? (
                  <div className="animate-pulse bg-gray-200 h-9 w-20 rounded-xl"></div>
                ) : session?.user ? (
                  <>
                    <Link
                      href="/pricing"
                      className="hidden sm:inline-flex text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium border border-yellow-500 bg-yellow-100 hover:bg-yellow-200 text-sm sm:text-base"
                    >
                      Upgrade Tier
                    </Link>
                  <UserMenu user={session.user} />
                  </>
                ) : (
                  <>
                    {pathname === '/' ? (
                      <button
                        type="button"
                        onClick={handleScrollToPricing}
                        className="hidden sm:inline-flex text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                      >
                        Pricing
                      </button>
                    ) : (
                    <Link 
                      href="/pricing" 
                      className="hidden sm:inline-flex text-gray-600 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm sm:text-base"
                    >
                      Pricing
                    </Link>
                    )}
                    <div className="flex gap-1 sm:gap-2">
                    <Button 
                      variant="outlined" 
                      size="sm"
                      onClick={() => setAuthOpen(true)}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Sign in
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => setAuthOpen(true)}
                      className="text-xs sm:text-sm px-2 sm:px-3"
                    >
                      Get started
                    </Button>
                    </div>
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
      </NotificationWrapper>
    </FirebaseAuthProvider>
  );
}

// Separate component to handle notifications
function NotificationWrapper({ children }: { children: React.ReactNode }) {
  // Initialize notifications hook
  const { isPolling, lastError } = useNotifications();
  
  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    useEffect(() => {
      if (lastError) {
        console.warn('Notification polling error:', lastError);
      }
    }, [lastError]);
  }
  
  return <>{children}</>;
} 
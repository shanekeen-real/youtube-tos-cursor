"use client";
import React, { useState, createContext } from 'react';
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <Logo 
                  size={40} 
                  className="hidden sm:block transition-transform group-hover:scale-105" 
                />
                <Logo 
                  size={32} 
                  className="block sm:hidden transition-transform group-hover:scale-105" 
                />
                <div className="flex items-center gap-2">
                <span className="font-bold text-xl text-gray-900">Yellow Dollar</span>
                  <span className="bg-yellow-500 text-gray-900 text-xs font-semibold px-2 py-1 rounded-full">
                    BETA
                  </span>
                </div>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-6">
                {status === 'loading' ? (
                  <div className="animate-pulse bg-gray-200 h-9 w-20 rounded-xl"></div>
                ) : session?.user ? (
                  <>
                    <Link
                      href="/pricing"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium border border-yellow-500 bg-yellow-100 hover:bg-yellow-200"
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
                        className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                      >
                        Pricing
                      </button>
                    ) : (
                    <Link 
                      href="/pricing" 
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                      Pricing
                    </Link>
                    )}
                    <div className="flex gap-2">
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
                      className="ml-[10px]"
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
  useNotifications();
  
  return <>{children}</>;
} 
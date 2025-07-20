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

export const AuthContext = createContext<{
  user: Session['user'] | null;
  setAuthOpen: (open: boolean) => void;
} | null>(null);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();

  return (
    <FirebaseAuthProvider>
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
    </FirebaseAuthProvider>
  );
} 
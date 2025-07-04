"use client";
import React, { useState, createContext } from 'react';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';
import Button from './Button';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export const AuthContext = createContext<{
  user: any;
  setAuthOpen: (open: boolean) => void;
} | null>(null);

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <AuthContext.Provider value={{ user: session?.user || null, setAuthOpen }}>
      <header className="w-full flex items-center justify-between max-w-5xl mx-auto mb-12 pt-4 px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-red-600 text-white font-bold rounded px-2 py-1 text-lg">YT</div>
            <span className="font-bold text-xl text-[#212121]">TOS Analyzer</span>
          </Link>
        </div>
        <nav className="flex gap-4 text-sm items-center">
          {status === 'loading' ? (
            <div className="animate-pulse bg-gray-200 h-9 w-20 rounded"></div>
          ) : session?.user ? (
            <UserMenu user={session.user} />
          ) : (
            <>
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900 px-3 py-2">Pricing</Link>
              <Button variant="outlined" className="h-9 px-4" onClick={() => setAuthOpen(true)}>Sign in</Button>
              <Button variant="blue" className="h-9 px-4" onClick={() => setAuthOpen(true)}>Get started</Button>
            </>
          )}
        </nav>
      </header>
      <div className="w-full flex flex-col items-center">{children}</div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </AuthContext.Provider>
  );
} 
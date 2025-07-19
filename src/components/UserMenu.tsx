"use client";

import React, { useState, useRef, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
  ChevronDown, 
  User, 
  Settings, 
  BarChart3, 
  CreditCard, 
  LogOut,
  Shield,
  History,
  Crown,
  Star,
  Zap,
  Video
} from 'lucide-react';

interface UserMenuProps {
  user: any;
}

interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
}

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/get-user-profile');
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data.userProfile as UserProfile);
        } else {
          console.error('Failed to fetch user profile:', response.statusText);
        }
      } catch (err: any) {
        console.error('Failed to fetch user profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, [session?.user?.id]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      // Clear 2FA verification before signing out
      if (session?.user?.id) {
        await fetch('/api/clear-2fa-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Error clearing 2FA verification:', error);
    }
    
    await signOut({ callbackUrl: '/' });
  };

  // Get tier display info
  const getTierDisplay = (tier: string) => {
    switch (tier) {
      case 'free':
        return { name: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: User };
      case 'pro':
        return { name: 'Pro', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: Star };
      case 'advanced':
        return { name: 'Advanced', color: 'text-green-600', bgColor: 'bg-green-100', icon: Zap };
      case 'enterprise':
        return { name: 'Enterprise', color: 'text-red-600', bgColor: 'bg-red-100', icon: Crown };
      default:
        return { name: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: User };
    }
  };

  const tierInfo = userProfile ? getTierDisplay(userProfile.subscriptionTier) : getTierDisplay('free');
  const TierIcon = tierInfo.icon;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-gray-50 border border-gray-200 transition-all duration-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar */}
        {user.image ? (
          <img 
            src={user.image} 
            alt="avatar" 
            className="w-8 h-8 rounded-xl object-cover border border-gray-200" 
          />
        ) : (
          <div className="w-8 h-8 bg-yellow-500 rounded-xl flex items-center justify-center border border-gray-200">
            <User className="w-4 h-4 text-gray-900" />
          </div>
        )}
        
        {/* User Info */}
        <div className="hidden sm:block text-left">
          <div className="font-medium text-gray-900 text-sm">
            {user.name || user.email?.split('@')[0]}
          </div>
          <div className="flex items-center gap-2">
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierInfo.bgColor} ${tierInfo.color}`}>
              <TierIcon className="w-3 h-3" />
              {tierInfo.name}
            </div>
          </div>
        </div>
        
        {/* Dropdown Arrow */}
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img 
                  src={user.image} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-xl object-cover border border-gray-200" 
                />
              ) : (
                <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center border border-gray-200">
                  <User className="w-5 h-5 text-gray-900" />
                </div>
              )}
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {user.name || user.email?.split('@')[0]}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tierInfo.bgColor} ${tierInfo.color}`}>
                    <TierIcon className="w-3 h-3" />
                    {tierInfo.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Dashboard</span>
            </Link>
            
            <Link 
              href="/my-videos" 
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Video className="w-4 h-4 text-gray-500" />
              <span className="font-medium">My Videos</span>
            </Link>
            
            <Link 
              href="/scan-history" 
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <History className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Scan History</span>
            </Link>
            
            <Link 
              href="/pricing" 
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Pricing & Billing</span>
            </Link>
            
            <Link 
              href="/settings" 
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Settings</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-1"></div>

          {/* Sign Out */}
          <button 
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors w-full text-left"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 text-gray-500" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
} 
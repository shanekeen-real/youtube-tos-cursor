import React from 'react';
import { Settings, Moon, Sun, Smartphone, CheckCircle } from 'lucide-react';
import Card from '../Card';
import Button from '../Button';

interface UserProfile {
  email: string;
  createdAt: string;
  scanCount: number;
  scanLimit: number;
  subscriptionTier: 'free' | 'pro' | 'advanced' | 'enterprise';
  stripeCustomerId?: string;
  subscriptionData?: {
    renewalDate?: string;
    cancelledAt?: string;
    expiresAt?: string;
  };
  twoFactorEnabled?: boolean;
  twoFactorSetupAt?: string;
  twoFactorEnabledAt?: string;
}

interface PreferencesCardProps {
  userProfile: UserProfile | null;
  dark: boolean;
  onToggleDarkMode: () => void;
  onOpenTwoFactorSetup: () => void;
  onOpenTwoFactorDisable: () => void;
}

export default function PreferencesCard({ 
  userProfile, 
  dark, 
  onToggleDarkMode, 
  onOpenTwoFactorSetup, 
  onOpenTwoFactorDisable 
}: PreferencesCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Settings className="w-5 h-5 text-yellow-500" />
        <h2 className="text-subtitle font-semibold text-gray-800">Preferences</h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="w-4 h-4 text-gray-600" /> : <Sun className="w-4 h-4 text-gray-600" />}
            <span className="text-gray-700">Dark Mode</span>
          </div>
          <Button 
            variant={dark ? 'primary' : 'outlined'} 
            size="sm"
            onClick={onToggleDarkMode}
          >
            {dark ? 'On' : 'Off'}
          </Button>
        </div>
        
        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-gray-600" />
            <div>
              <span className="text-gray-700">Two-Factor Authentication</span>
              <p className="text-xs text-gray-500">
                {userProfile?.twoFactorEnabled 
                  ? `Enabled on ${userProfile.twoFactorEnabledAt ? new Date(userProfile.twoFactorEnabledAt).toLocaleDateString() : 'recently'}`
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userProfile?.twoFactorEnabled ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 bg-safe/10 rounded-full">
                  <CheckCircle className="w-3 h-3 text-safe" />
                  <span className="text-xs text-safe font-medium">Enabled</span>
                </div>
                <Button 
                  variant="outlined" 
                  size="sm"
                  onClick={onOpenTwoFactorDisable}
                >
                  Disable
                </Button>
              </div>
            ) : (
              <Button 
                variant="outlined" 
                size="sm"
                onClick={onOpenTwoFactorSetup}
              >
                Enable
              </Button>
            )}
          </div>
        </div>
        
        <div className="text-caption text-gray-500">
          More settings and preferences coming soon...
        </div>
      </div>
    </Card>
  );
} 
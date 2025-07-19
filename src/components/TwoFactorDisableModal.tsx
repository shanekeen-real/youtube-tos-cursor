"use client";
import React, { useState } from 'react';
import { X, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/lib/imports';
import { useToastContext } from '@/contexts/ToastContext';

interface TwoFactorDisableModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwoFactorDisableModal({ open, onClose, onSuccess }: TwoFactorDisableModalProps) {
  const { showSuccess, showError } = useToastContext();
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const disableTwoFactor = async () => {
    if (!token.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/disable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (response.ok) {
        showSuccess('2FA Disabled', 'Two-factor authentication has been successfully disabled.');
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Invalid verification code';
        setError(errorMessage);
        showError('2FA Disable Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Failed to disable 2FA. Please try again.';
      setError(errorMessage);
      showError('2FA Disable Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setToken('');
    setError('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-risk" />
            <h2 className="text-lg font-semibold text-gray-800">Disable Two-Factor Authentication</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-risk mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Confirm Disable 2FA</h3>
              <p className="text-gray-600 text-sm">
                Enter your current 6-digit verification code to disable two-factor authentication
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-risk/5 border border-risk/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-risk" />
                  <p className="text-sm text-risk">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={disableTwoFactor}
                  variant="danger"
                  className="w-full"
                  disabled={loading || token.length !== 6}
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  className="w-full"
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
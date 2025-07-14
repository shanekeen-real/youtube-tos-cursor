"use client";
import React, { useState, useEffect } from 'react';
import { X, Shield, Smartphone, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from './Button';
import { useToastContext } from '@/contexts/ToastContext';

interface TwoFactorSetupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwoFactorSetupModal({ open, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const { showSuccess, showError } = useToastContext();
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && step === 'setup') {
      setupTwoFactor();
    }
  }, [open, step]);

  const setupTwoFactor = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/setup-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to setup 2FA';
        setError(errorMessage);
        showError('2FA Setup Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Failed to setup 2FA. Please try again.';
      setError(errorMessage);
      showError('2FA Setup Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    if (!token.trim()) {
      setError('Please enter a verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (response.ok) {
        showSuccess('2FA Enabled', 'Two-factor authentication has been successfully enabled!');
        onSuccess();
        onClose();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Invalid verification code';
        setError(errorMessage);
        showError('2FA Verification Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Failed to verify code. Please try again.';
      setError(errorMessage);
      showError('2FA Verification Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      showSuccess('Secret Copied', 'Backup code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      const errorMessage = 'Failed to copy secret';
      setError(errorMessage);
      showError('Copy Error', errorMessage);
    }
  };

  const handleClose = () => {
    setStep('setup');
    setQrCode('');
    setSecret('');
    setToken('');
    setError('');
    setCopied(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Set Up Two-Factor Authentication</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Scan QR Code</h3>
                <p className="text-gray-600 text-sm">
                  Use your authenticator app to scan the QR code below
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                </div>
              ) : qrCode ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <img src={qrCode} alt="QR Code" className="border border-gray-200 rounded-lg" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Manual Entry Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={secret}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono"
                      />
                      <Button
                        onClick={copySecret}
                        variant="outlined"
                        size="sm"
                        className="whitespace-nowrap"
                      >
                        {copied ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-risk/5 border border-risk/20 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-risk" />
                      <p className="text-sm text-risk">{error}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button
                      onClick={() => setStep('verify')}
                      className="w-full"
                      disabled={loading}
                    >
                      Next: Verify Code
                    </Button>
                    <Button
                      onClick={setupTwoFactor}
                      variant="outlined"
                      className="w-full"
                      disabled={loading}
                    >
                      Generate New Code
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Failed to generate QR code</p>
                  <Button
                    onClick={setupTwoFactor}
                    variant="outlined"
                    className="mt-3"
                    disabled={loading}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">Verify Setup</h3>
                <p className="text-gray-600 text-sm">
                  Enter the 6-digit code from your authenticator app
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
                    onClick={verifyToken}
                    className="w-full"
                    disabled={loading || token.length !== 6}
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                  </Button>
                  <Button
                    onClick={() => setStep('setup')}
                    variant="outlined"
                    className="w-full"
                    disabled={loading}
                  >
                    Back to Setup
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
"use client";

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/lib/imports';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
  showRetry?: boolean;
  showCancel?: boolean;
}

export default function ErrorState({ 
  error, 
  onRetry, 
  onCancel, 
  className,
  showRetry = true,
  showCancel = false
}: ErrorStateProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-red-600 font-medium mb-2">Error</p>
      <p className="text-gray-600 mb-6">{error}</p>
      <div className="flex gap-3 justify-center">
        {showRetry && onRetry && (
          <Button onClick={onRetry} className="inline-flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        )}
        {showCancel && onCancel && (
          <Button variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
} 
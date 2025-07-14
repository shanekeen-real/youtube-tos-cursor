"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ToastContextType {
  showSuccess: (title: string, description?: string, action?: React.ReactNode) => void;
  showError: (title: string, description?: string, action?: React.ReactNode) => void;
  showWarning: (title: string, description?: string, action?: React.ReactNode) => void;
  showInfo: (title: string, description?: string, action?: React.ReactNode) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const showSuccess = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "success",
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          {title}
        </div>
      ),
      description,
      action,
      duration: 5000, // 5 seconds
    });
  };

  const showError = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "destructive",
      title: (
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          {title}
        </div>
      ),
      description,
      action,
      duration: 7000, // 7 seconds
    });
  };

  const showWarning = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "warning",
      title: (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          {title}
        </div>
      ),
      description,
      action,
      duration: 6000, // 6 seconds
    });
  };

  const showInfo = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "default",
      title: (
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600" />
          {title}
        </div>
      ),
      description,
      action,
      duration: 5000, // 5 seconds
    });
  };

  return (
    <ToastContext.Provider value={{
      showSuccess,
      showError,
      showWarning,
      showInfo,
    }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
} 
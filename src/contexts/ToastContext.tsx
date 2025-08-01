"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

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
      title,
      description,
      ...(action ? { action: action as import("@/components/ui/toast").ToastActionElement } : {}),
      duration: 5000, // 5 seconds
    });
  };

  const showError = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "destructive",
      title,
      description,
      ...(action ? { action: action as import("@/components/ui/toast").ToastActionElement } : {}),
      duration: 7000, // 7 seconds
    });
  };

  const showWarning = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "warning",
      title,
      description,
      ...(action ? { action: action as import("@/components/ui/toast").ToastActionElement } : {}),
      duration: 6000, // 6 seconds
    });
  };

  const showInfo = (title: string, description?: string, action?: React.ReactNode) => {
    toast({
      variant: "default",
      title,
      description,
      ...(action ? { action: action as import("@/components/ui/toast").ToastActionElement } : {}),
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
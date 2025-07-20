"use client";

import { useState } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { signOut } from 'next-auth/react';

export function useSettingsActions() {
  const { showSuccess, showError } = useToastContext();
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dark, setDark] = useState(false);

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDark(prev => !prev);
  };

  // Subscription management
  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    setSubscriptionError(null); // Clear any previous errors
    
    try {
      const response = await fetch('/api/create-customer-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        const errorData = await response.json();
        console.error('Failed to create customer portal session:', errorData);
        
        // Show more helpful error messages based on the error type
        let errorMessage = 'Failed to open subscription management. Please try again.';
        
        if (errorData.error === 'No Stripe customer ID found') {
          errorMessage = errorData.details || 'You need to have an active subscription to access the customer portal. Please upgrade your plan first.';
        } else if (errorData.error === 'No active subscription found') {
          errorMessage = errorData.details || 'Your subscription may have expired or been cancelled. Please check your subscription status or upgrade your plan.';
        } else if (errorData.error === 'Failed to verify subscription status') {
          errorMessage = errorData.details || 'Unable to check your subscription status. Please try again or contact support.';
        } else if (errorData.details) {
          errorMessage = errorData.details;
        }
        
        setSubscriptionError(errorMessage);
      }
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      setSubscriptionError('Failed to open subscription management. Please try again.');
    } finally {
      setManagingSubscription(false);
    }
  };

  // Data export
  const handleExport = async () => {
    setExportStatus(null);
    try {
      const res = await fetch("/api/export-user-data");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "yellow-dollar-user-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setExportStatus("Export successful. Check your downloads.");
    } catch (err: unknown) {
      setExportStatus("Export failed: " + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Account deletion
  const handleDelete = async () => {
    if (!window.confirm("Are you sure? This will permanently delete your account and all data. This cannot be undone.")) return;
    setDeleting(true);
    setDeleteStatus(null);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setDeleteStatus("Account deleted successfully.");
      // Automatically sign out and redirect after deletion
      setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, 1500);
    } catch (err: unknown) {
      setDeleteStatus("Delete failed: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  // Clear subscription error
  const clearSubscriptionError = () => {
    setSubscriptionError(null);
  };

  return {
    // Dark mode
    dark,
    toggleDarkMode,
    
    // Subscription management
    managingSubscription,
    subscriptionError,
    handleManageSubscription,
    clearSubscriptionError,
    
    // Data export
    exportStatus,
    handleExport,
    
    // Account deletion
    deleteStatus,
    deleting,
    handleDelete
  };
} 
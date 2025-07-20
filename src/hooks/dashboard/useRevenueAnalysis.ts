"use client";

import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { RevenueData, YouTubeChannel } from '@/components/dashboard/types';

export function useRevenueAnalysis(session: Session | null, ytChannel: YouTubeChannel | null) {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [revenueLastFetched, setRevenueLastFetched] = useState<number>(0);
  const [cpmSetupModalOpen, setCpmSetupModalOpen] = useState(false);

  // Fetch revenue at risk data
  useEffect(() => {
    const fetchRevenue = async () => {
      // Only fetch if more than 5 minutes have passed since last fetch
      if (Date.now() - revenueLastFetched < 5 * 60 * 1000) return;
      setRevenueLoading(true);
      setRevenueError(null);
      try {
        const res = await fetch('/api/revenue-at-risk');
        setRevenueLastFetched(Date.now());
        if (!res.ok) throw new Error('Failed to fetch revenue at risk');
        const data = await res.json();
        setRevenueData(data);
      } catch (err: unknown) {
        setRevenueError(err instanceof Error ? err.message : 'Failed to fetch revenue at risk');
      } finally {
        setRevenueLoading(false);
      }
    };

    // If YouTube is connected, add a small delay to ensure Firestore data is propagated
    if (ytChannel) {
      const timer = setTimeout(() => {
        fetchRevenue();
      }, 1000); // 1 second delay
      return () => clearTimeout(timer);
    } else {
      // If no YouTube channel, fetch immediately (will show setup required or error)
      fetchRevenue();
    }
  }, [ytChannel, revenueLastFetched]);

  const handleCPMSetupComplete = () => {
    // Refresh revenue data after CPM setup
    const fetchRevenue = async () => {
      setRevenueLoading(true);
      setRevenueError(null);
      try {
        const res = await fetch('/api/revenue-at-risk');
        if (!res.ok) throw new Error('Failed to fetch revenue at risk');
        const data = await res.json();
        setRevenueData(data);
      } catch (err: unknown) {
        setRevenueError(err instanceof Error ? err.message : 'Failed to fetch revenue at risk');
      } finally {
        setRevenueLoading(false);
      }
    };
    fetchRevenue();
  };

  // Add refresh handlers
  const handleRefreshRevenue = async () => {
    setRevenueLoading(true);
    setRevenueError(null);
    try {
      const res = await fetch('/api/revenue-at-risk');
      setRevenueLastFetched(Date.now());
      if (!res.ok) throw new Error('Failed to fetch revenue at risk');
      const data = await res.json();
      setRevenueData(data);
    } catch (err: unknown) {
      setRevenueError(err instanceof Error ? err.message : 'Failed to fetch revenue at risk');
    } finally {
      setRevenueLoading(false);
    }
  };

  return {
    revenueData,
    revenueLoading,
    revenueError,
    revenueLastFetched,
    cpmSetupModalOpen,
    setCpmSetupModalOpen,
    fetchRevenue: handleRefreshRevenue,
    handleCPMSetupComplete,
    handleRefreshRevenue
  };
} 
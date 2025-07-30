import { useState, useEffect, useCallback, useRef } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import React from 'react';

interface ScanNotification {
  id: string;
  userId: string;
  queueId: string;
  scanId: string;
  videoTitle: string;
  videoId: string;
  status: string;
  createdAt: any;
  read: boolean;
}

interface NotificationsResponse {
  success: boolean;
  notifications: ScanNotification[];
  totalCount: number;
  unreadCount: number;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<ScanNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { showSuccess } = useToastContext();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const isPageVisibleRef = useRef<boolean>(true);
  const consecutiveErrorsRef = useRef<number>(0);
  const lastFetchTimeRef = useRef<number>(0);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
    };

    // Track user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Track page visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Determine if notifications should be active based on authentication and page
  const shouldPollNotifications = useCallback(() => {
    // Only poll if user is authenticated
    if (status !== 'authenticated' || !session?.user?.id) {
      return false;
    }

    // Only poll on relevant pages where notifications matter
    const relevantPages = ['/dashboard', '/queue', '/results', '/my-videos', '/settings'];
    const isRelevantPage = relevantPages.some(page => pathname.startsWith(page));
    
    return isRelevantPage;
  }, [status, session?.user?.id, pathname]);

  // Check if user is actively using the app
  const isUserActive = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const isVisible = isPageVisibleRef.current;
    
    // Consider user active if:
    // 1. Page is visible AND
    // 2. User has been active in the last 5 minutes
    return isVisible && timeSinceLastActivity < 5 * 60 * 1000;
  }, []);

  // Calculate backoff delay based on consecutive errors
  const getBackoffDelay = useCallback(() => {
    const baseDelay = 5000; // 5 seconds base
    const maxDelay = 300000; // 5 minutes max
    const delay = Math.min(baseDelay * Math.pow(2, consecutiveErrorsRef.current), maxDelay);
    return delay;
  }, []);

  // Fetch notifications from the API with error handling
  const fetchNotifications = useCallback(async () => {
    // Early return if not authenticated
    if (!shouldPollNotifications()) {
      return [];
    }

    // Prevent too frequent requests
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    const minInterval = 2000; // Minimum 2 seconds between requests
    
    if (timeSinceLastFetch < minInterval) {
      return notifications;
    }

    try {
      const response = await fetch('/api/queue/get-notifications?unreadOnly=true&limit=5');
      
      if (response.ok) {
        const data: NotificationsResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setLastError(null);
        consecutiveErrorsRef.current = 0; // Reset error count on success
        lastFetchTimeRef.current = now;
        return data.notifications;
      } else if (response.status === 401) {
        // Unauthorized - stop polling
        setLastError('Authentication required');
        consecutiveErrorsRef.current++;
        return [];
      } else if (response.status === 429) {
        // Rate limited - use exponential backoff
        setLastError('Rate limited - slowing down requests');
        consecutiveErrorsRef.current++;
        return notifications; // Return existing notifications
      } else {
        // Other errors
        setLastError(`HTTP ${response.status}: ${response.statusText}`);
        consecutiveErrorsRef.current++;
        return notifications; // Return existing notifications
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setLastError(error instanceof Error ? error.message : 'Network error');
      consecutiveErrorsRef.current++;
      return notifications; // Return existing notifications
    }
  }, [shouldPollNotifications, notifications]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    // Early return if not authenticated
    if (!session?.user?.id) {
      return;
    }

    try {
      const response = await fetch('/api/queue/get-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds })
      });
      
      if (response.ok) {
        // Update local state
        setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
        setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [session?.user?.id]);

  // Handle new notification
  const handleNewNotification = useCallback((notification: ScanNotification) => {
    // Create the button element properly
    const viewResultsButton = React.createElement(
      'button',
      {
        onClick: () => {
          router.push(`/results?scanId=${notification.scanId}`);
          markAsRead([notification.id]);
        },
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors'
      },
      'View Results'
    );

    // Show toast notification
    showSuccess(
      'Scan Completed!', 
      `Your scan of "${notification.videoTitle}" has been completed.`,
      viewResultsButton
    );

    // Update local state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, [showSuccess, router, markAsRead]);

  // Poll for new notifications with optimized frequency and error handling
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      // Only start polling if conditions are met
      if (!shouldPollNotifications()) {
        setIsPolling(false);
        return;
      }

      setIsPolling(true);
      
      // Optimized polling frequency based on page activity, user behavior, and error state
      const getPollingInterval = () => {
        // If we have consecutive errors, use exponential backoff
        if (consecutiveErrorsRef.current > 0) {
          return getBackoffDelay();
        }

        // Check if user is active
        const userActive = isUserActive();
        
        // More frequent polling on queue page where users expect real-time updates
        if (pathname.startsWith('/queue')) {
          return userActive ? 8000 : 30000; // 8s if active, 30s if inactive
        }
        
        // Less frequent polling on other pages
        return userActive ? 15000 : 60000; // 15s if active, 60s if inactive
      };

      interval = setInterval(async () => {
        // Check again before making the API call
        if (!shouldPollNotifications()) {
          return;
        }

        const currentNotifications = await fetchNotifications();
        
        // Check for new notifications by comparing with existing ones
        const newNotifications = currentNotifications.filter(
          notification => !notifications.some(existing => existing.id === notification.id)
        );
        
        // Handle new notifications
        newNotifications.forEach(handleNewNotification);
      }, getPollingInterval());
    };

    const stopPolling = () => {
      setIsPolling(false);
      if (interval) {
        clearInterval(interval);
      }
    };

    // Start or stop polling based on conditions
    if (shouldPollNotifications()) {
      startPolling();
    } else {
      stopPolling();
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [fetchNotifications, notifications, handleNewNotification, shouldPollNotifications, pathname, isUserActive, getBackoffDelay]);

  // Initial fetch only when conditions are met
  useEffect(() => {
    if (shouldPollNotifications()) {
      fetchNotifications();
    }
  }, [fetchNotifications, shouldPollNotifications]);

  return {
    notifications,
    unreadCount,
    isPolling,
    lastError,
    fetchNotifications,
    markAsRead,
    handleNewNotification
  };
} 
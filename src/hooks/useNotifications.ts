import { useState, useEffect, useCallback } from 'react';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
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
  const { showSuccess } = useToastContext();
  const router = useRouter();

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/queue/get-notifications?unreadOnly=true&limit=5');
      if (response.ok) {
        const data: NotificationsResponse = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        return data.notifications;
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
    return [];
  }, []);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
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
  }, []);

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

  // Poll for new notifications
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      setIsPolling(true);
      interval = setInterval(async () => {
        const currentNotifications = await fetchNotifications();
        
        // Check for new notifications by comparing with existing ones
        const newNotifications = currentNotifications.filter(
          notification => !notifications.some(existing => existing.id === notification.id)
        );
        
        // Handle new notifications
        newNotifications.forEach(handleNewNotification);
      }, 10000); // Poll every 10 seconds
    };

    const stopPolling = () => {
      setIsPolling(false);
      if (interval) {
        clearInterval(interval);
      }
    };

    // Start polling when component mounts
    startPolling();

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, [fetchNotifications, notifications, handleNewNotification]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isPolling,
    fetchNotifications,
    markAsRead,
    handleNewNotification
  };
} 
import { useState, useEffect } from 'react';
import { Session } from 'next-auth';

interface YouTubeChannel {
  snippet?: {
    thumbnails?: { default?: { url?: string } };
    title?: string;
    customUrl?: string;
  };
  statistics?: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
  };
}

interface ChannelContext {
  channelData?: {
    title?: string;
    description?: string;
    subscriberCount?: string | number;
    viewCount?: string | number;
    videoCount?: string | number;
  };
  aiIndicators?: {
    aiProbability?: number;
    confidence?: number;
  };
}

export function useSettingsYouTube(session: Session | null) {
  const [ytChannel, setYtChannel] = useState<YouTubeChannel | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytFetching, setYtFetching] = useState(false);
  const [channelContext, setChannelContext] = useState<ChannelContext | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isFreshConnection, setIsFreshConnection] = useState(false);

  // Fetch YouTube data on mount
  useEffect(() => {
    let retryCount = 0;
    const fetchYouTube = async () => {
      setYtLoading(true);
      // Wait for session to be ready
      if (!session?.user?.id) {
        if (retryCount < 10) {
          retryCount++;
          setTimeout(fetchYouTube, 200);
        } else {
          setYtChannel(null);
          setYtLoading(false);
        }
        return;
      }
      try {
        const response = await fetch('/api/get-user-profile');
        if (response.ok) {
          const data = await response.json();
          if (data.userProfile?.youtube?.channel) {
            setYtChannel(data.userProfile.youtube.channel);
            // Also get channel context if available
            if (data.userProfile.youtube?.channelContext) {
              setChannelContext(data.userProfile.youtube.channelContext);
            } else {
              console.log('No channel context in response');
            }
          } else {
            // No channel data found, set to null (don't auto-reconnect)
            setYtChannel(null);
            setChannelContext(null);
          }
        } else {
          setYtChannel(null);
          setChannelContext(null);
        }
      } catch {
        setYtChannel(null);
      } finally {
        setYtLoading(false);
      }
    };
    fetchYouTube();

    // Refresh YouTube data when user returns to the tab
    const handleFocus = () => {
      if (session?.user?.id) {
        fetchYouTube();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session?.user?.id]);

  // Show welcome modal when YouTube is connected (same logic as Dashboard)
  useEffect(() => {
    // Add a small delay to ensure data is properly loaded
    const timer = setTimeout(() => {
      console.log('Welcome modal trigger check:', {
        hasChannelContext: !!channelContext,
        hasChannelData: !!channelContext?.channelData,
        hasYtChannel: !!ytChannel,
        isFreshConnection: isFreshConnection,
        sessionStorageShown: window.sessionStorage.getItem('ytWelcomeModalShown'),
        channelContext: channelContext
      });
      
      // Show modal only if this is a NEW connection (not just existing data)
      // We need to track if this is the first time we're seeing this channel data
      const modalShown = window.sessionStorage.getItem('ytWelcomeModalShown');
      const modalShownTime = modalShown ? parseInt(modalShown) : 0;
      const isRecent = Date.now() - modalShownTime < 24 * 60 * 60 * 1000; // 24 hours
      
      // Only show modal if this is a fresh connection (not just existing data)
      const hasChannelData = channelContext?.channelData || ytChannel;
      const shouldShowModal = hasChannelData && isFreshConnection && (!modalShown || !isRecent);
      
      console.log('Should show modal:', shouldShowModal);
      
      if (shouldShowModal) {
        console.log('Triggering welcome modal');
        setShowWelcomeModal(true);
        // Reset the fresh connection flag after triggering modal
        setIsFreshConnection(false);
        // Don't set sessionStorage immediately - let the modal handle it
      }
    }, 500); // 500ms delay
    
    return () => clearTimeout(timer);
  }, [channelContext, ytChannel, isFreshConnection]);

  // Connect YouTube channel
  const handleConnectYouTube = async () => {
    if (!session?.user?.id) return;
    setYtFetching(true);
    try {
      const response = await fetch('/api/fetch-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('YouTube connection response:', data);
        setYtChannel(data.channel);
        if (data.channelContext) {
          console.log('Setting channel context:', data.channelContext);
          setChannelContext(data.channelContext);
        } else {
          console.log('No channel context in response');
        }
        // Mark this as a fresh connection to trigger welcome modal
        setIsFreshConnection(true);
      } else {
        const errorData = await response.json();
        console.error('Failed to connect YouTube:', errorData.error);
        throw new Error('Failed to connect YouTube channel. Please try again.');
      }
    } catch (error) {
      console.error('Error connecting YouTube:', error);
      throw error;
    } finally {
      setYtFetching(false);
    }
  };

  // Unlink YouTube channel with confirmation
  const handleUnlinkYouTube = async () => {
    if (!session?.user?.id) return;
    
    // Business logic: Show confirmation dialog
    if (!window.confirm('Are you sure you want to unlink your YouTube channel?')) {
      return;
    }
    
    try {
      const response = await fetch('/api/unlink-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        setYtChannel(null);
        setChannelContext(null);
        // Clear the welcome modal session flag so it will show again on reconnect
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ytWelcomeModalShown');
        }
      } else {
        throw new Error('Failed to unlink YouTube channel. Please try again.');
      }
    } catch (error) {
      console.error('Error unlinking YouTube:', error);
      throw error;
    }
  };

  return {
    ytChannel,
    ytLoading,
    ytFetching,
    channelContext,
    showWelcomeModal,
    setShowWelcomeModal,
    handleConnectYouTube,
    handleUnlinkYouTube
  };
} 
import { useState, useEffect } from 'react';
import { Session } from 'next-auth';
import { YouTubeChannel, ChannelContext } from '@/components/dashboard/types';

export function useYouTubeIntegration(session: Session | null) {
  const [ytChannel, setYtChannel] = useState<YouTubeChannel | null>(null);
  const [ytLoading, setYtLoading] = useState(false);
  const [ytFetching, setYtFetching] = useState(false);
  const [channelContext, setChannelContext] = useState<ChannelContext | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isFreshConnection, setIsFreshConnection] = useState(false);

  // Log user ID to browser console for testing
  useEffect(() => {
    if (session?.user?.id) {
      console.log('User ID:', session.user.id);
    } else {
      console.log('No user ID found in session');
    }
  }, [session?.user?.id]);

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

    // Only refresh YouTube data on initial load, not on tab focus
    // Removed window focus event listener to prevent constant re-fetching
  }, [session?.user?.id]);

  // Show welcome modal on first connection
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

  // After YouTube connect, refetch user profile
  const handleYouTubeConnect = async () => {
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
        setYtChannel(data.channel);
        if (data.channelContext) {
          setChannelContext(data.channelContext);
        }
        // Mark this as a fresh connection to trigger welcome modal
        setIsFreshConnection(true);
      } else {
        const errorData = await response.json();
        alert('Failed to connect YouTube channel. Please try again.');
      }
    } catch (error) {
      alert('Failed to connect YouTube channel. Please try again.');
    } finally {
      setYtFetching(false);
    }
  };

  return {
    ytChannel,
    ytLoading,
    ytFetching,
    channelContext,
    showWelcomeModal,
    setShowWelcomeModal,
    handleYouTubeConnect
  };
} 
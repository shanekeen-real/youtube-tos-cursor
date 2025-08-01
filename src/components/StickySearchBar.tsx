import React, { useState, useContext, useEffect, useRef } from 'react';
import { UIButton as Button, UIInput as Input } from '@/lib/imports';
import { AuthContext } from '@/lib/imports';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search, Link, FileText } from 'lucide-react';
import ScanProgressModal from './ScanProgressModal';
import { useToastContext } from '@/contexts/ToastContext';

const StickySearchBar = () => {
  const auth = useContext(AuthContext);
  const router = useRouter();
  const { showSuccess } = useToastContext();
  const [searchValue, setSearchValue] = useState('');
  const [activeTab, setActiveTab] = useState<'url' | 'text'>('url');
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQueueButton, setShowQueueButton] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanModalThumbnail, setScanModalThumbnail] = useState('');
  const [scanModalTitle, setScanModalTitle] = useState('');
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Scroll-aware collapse/expand logic
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > lastScrollY.current + 10) {
            setCollapsed(true);
          } else if (currentScrollY < lastScrollY.current - 10) {
            setCollapsed(false);
          }
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExpand = () => setCollapsed(false);

  // Helper to fetch YouTube video thumbnail and title using oEmbed API
  const fetchYouTubeThumbnailAndTitle = async (url: string): Promise<{ thumbnail: string; title: string }> => {
    try {
      // Use YouTube's oEmbed API (much faster, no authentication required)
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (response.ok) {
        const data = await response.json();
        return { 
          thumbnail: data.thumbnail_url || '', 
          title: data.title || '' 
        };
      }
    } catch (error) {
      console.error('Failed to fetch video metadata via oEmbed:', error);
    }
    
    // Fallback to just thumbnail if oEmbed fails
    const match = url.match(/[?&]v=([\w-]{11})/) || url.match(/youtu\.be\/([\w-]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) return { thumbnail: '', title: '' };
    const thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return { thumbnail, title: '' };
  };

  const handleScan = async () => {
    setError(null);
    setShowQueueButton(false);
    if (!searchValue.trim()) return;
    if (!auth?.user) {
      auth?.setAuthOpen(true);
      return;
    }
    
    let thumbnail = '';
    let title = '';
    if (activeTab === 'url') {
      const meta = await fetchYouTubeThumbnailAndTitle(searchValue);
      thumbnail = meta.thumbnail;
      title = meta.title;
    }
    
    setScanModalThumbnail(thumbnail);
    setScanModalTitle(title);
    setShowScanModal(true);
    setLoading(true);
    
    try {
      const isUrl = activeTab === 'url';
      
      if (isUrl) {
        // Add to queue for URL scans
        const response = await fetch('/api/queue/add-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: searchValue,
            videoTitle: title,
            videoThumbnail: thumbnail,
            priority: 'normal',
            isOwnVideo: false,
            scanOptions: {
              includeTranscript: true,
              includeAI: true,
              includeMultiModal: true
            }
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add scan to queue');
        }
        
        const data = await response.json();
        
        // Show success message and close modal - scan happens in background
        setTimeout(() => {
          setShowScanModal(false);
          // Show success message instead of redirecting
          setError(null);
          showSuccess('Scan Added to Queue', 'Your video has been added to the scan queue and will be processed in the background. You can check the status in your queue anytime.');
        }, 1000);
        
      } else {
        // Direct processing for text/policy scans (keep existing flow)
        const endpoint = '/api/analyze-policy';
        const payload = { text: searchValue };
        const res = await axios.post(endpoint, payload);
        setTimeout(() => {
          setShowScanModal(false);
          router.push(`/results?scanId=${res.data.scanId}`);
        }, 1000);
      }
    } catch (e: any) {
      setShowScanModal(false);
      
      // Handle different error response formats
      let errorMessage = 'Error analyzing content. Please try again.';
      
      if (e?.response?.data?.error) {
        // Axios error format
        errorMessage = e.response.data.error;
      } else if (e?.message) {
        // Fetch error format or generic Error object
        errorMessage = e.message;
      } else if (e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'status' in e.response) {
        // Fetch error with response object
        const response = e.response as { status: number; data?: { error?: string; existingQueueId?: string; existingStatus?: string; existingProgress?: number } };
        if (response.status === 409) {
          if (response.data?.existingQueueId) {
            errorMessage = `${response.data.error} (Status: ${response.data.existingStatus}, Progress: ${response.data.existingProgress}%).`;
            setShowQueueButton(true);
          } else {
            errorMessage = response.data?.error || 'This video is already in your scan queue.';
            setShowQueueButton(false);
          }
        } else if (response.status === 429) {
          errorMessage = response.data?.error || 'Rate limit exceeded. Please try again later.';
          setShowQueueButton(false);
        } else {
          errorMessage = response.data?.error || 'Error analyzing content. Please try again.';
          setShowQueueButton(false);
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Sticky Search Bar (always rendered, animates in/out) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-sm transition-all duration-500 ease-in-out"
        style={{
          transform: collapsed ? 'translateY(100%)' : 'translateY(0)',
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : 'auto',
        }}
      >
        <div className="max-w-4xl mx-auto py-3 sm:py-4 px-2 overflow-hidden">
          {/* Tab Buttons */}
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="inline-flex rounded-lg p-1 bg-gray-100 border border-gray-200">
              {/* Analyze by URL on the left, Analyze by Text on the right */}
              <button
                onClick={() => setActiveTab('url')}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
                  activeTab === 'url'
                    ? 'bg-yellow-500 text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={activeTab === 'url'}
                tabIndex={0}
                type="button"
                disabled={loading}
              >
                <Link className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Scan YouTube Video</span>
                <span className="xs:hidden">Scan Video</span>
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
                  activeTab === 'text'
                    ? 'bg-yellow-500 text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={activeTab === 'text'}
                tabIndex={0}
                type="button"
                disabled={loading}
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Analyze by Text</span>
                <span className="xs:hidden">Analyze Text</span>
              </button>
            </div>
          </div>

          {/* Search Input and CTA */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder={activeTab === 'text' ? 'Paste YouTube terms or policy text here for scan...' : 'Enter YouTube Video URL for scan...'}
                value={searchValue}
                onChange={e => {
                  setSearchValue(e.target.value);
                  if (error) {
                    setError(null);
                    setShowQueueButton(false);
                  }
                }}
                className="h-10 sm:h-12 text-sm sm:text-base bg-white"
                aria-label={activeTab === 'text' ? 'Analyze by Text' : 'Analyze by URL'}
                disabled={loading}
              />
            </div>
            <Button 
              size="lg" 
              className="h-10 sm:h-12 px-4 sm:px-6 lg:px-8 btn-hover w-full sm:w-auto sm:min-w-[120px] lg:min-w-[130px]" 
              type="button" 
              onClick={handleScan} 
              disabled={loading || !searchValue.trim()}
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">
                {activeTab === 'text' ? (loading ? 'Scanning...' : 'Scan Text') : (loading ? 'Scanning...' : 'Scan URL')}
              </span>
            </Button>
          </div>
          {error && (
            <div className="text-red-600 text-xs sm:text-sm mt-2 text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <span>{error}</span>
                {showQueueButton && (
                  <Button
                    size="sm"
                    className="text-red-600 hover:text-red-800 text-xs sm:text-sm px-2 sm:px-3"
                    onClick={() => router.push('/queue')}
                    aria-label="View queue"
                  >
                    View Queue
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Floating Expand Button (overlays bar when collapsed) */}
      {collapsed && (
        <div>
          {/* Mobile: bottom-right icon button */}
          <button
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-yellow-500 text-gray-900 rounded-full shadow-lg p-3 sm:p-4 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 md:hidden"
            aria-label="Expand search bar"
            onClick={handleExpand}
            tabIndex={0}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
          >
            <Search className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          {/* Desktop: centered button with gradient stroke, white fill, yellow text */}
          <div className="hidden md:flex fixed bottom-6 left-0 right-0 z-50 justify-center pointer-events-none">
            <div className="bg-gradient-to-r from-yellow-400 to-black p-[2px] rounded-full pointer-events-auto">
              <Button
                size="lg"
                className="btn-hover px-6 lg:px-8 py-3 lg:py-4 text-base lg:text-lg font-semibold bg-white rounded-full text-black border-0 shadow-lg flex items-center justify-center hover:bg-gray-50 focus:ring-2 focus:ring-yellow-400"
                onClick={handleExpand}
                aria-label={activeTab === 'text' ? 'Expand and scan text' : 'Expand and scan video'}
                type="button"
                style={{ minWidth: '200px' }}
              >
                <Search className="h-4 w-4 lg:h-5 lg:w-5 mr-2 text-black" />
                {activeTab === 'text' ? 'Scan Text' : 'Scan Video'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showScanModal && scanModalThumbnail && (
        <ScanProgressModal
          open={showScanModal}
          onClose={() => setShowScanModal(false)}
          videoThumbnail={scanModalThumbnail}
          videoTitle={scanModalTitle || undefined}
          isOwnVideo={false}
        />
      )}
    </>
  );
};

export default StickySearchBar; 
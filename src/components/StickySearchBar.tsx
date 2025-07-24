import React, { useState, useContext, useEffect, useRef } from 'react';
import { UIButton as Button, UIInput as Input } from '@/lib/imports';
import { AuthContext } from '@/lib/imports';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search, Link, FileText } from 'lucide-react';

const StickySearchBar = () => {
  const [activeTab, setActiveTab] = useState('url'); // Default to 'url'
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const auth = useContext(AuthContext);
  const router = useRouter();

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

  const handleScan = async () => {
    setError(null);
    if (!searchValue.trim()) return;
    if (!auth?.user) {
      auth?.setAuthOpen(true);
      return;
    }
    setLoading(true);
    try {
      const isUrl = activeTab === 'url';
      const endpoint = isUrl ? '/api/analyze-url' : '/api/analyze-policy';
      const payload = isUrl ? { url: searchValue } : { text: searchValue };
      const res = await axios.post(endpoint, payload);
      router.push(`/results?scanId=${res.data.scanId}`);
    } catch (e: any) {
      if (e?.response?.data?.error) {
        setError(e.response.data.error);
      } else {
        setError('Error analyzing content. Please try again.');
      }
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
        <div className="max-w-4xl mx-auto py-4 px-2">
          {/* Tab Buttons */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex rounded-lg p-1 bg-gray-100 border border-gray-200">
              {/* Analyze by URL on the left, Analyze by Text on the right */}
              <button
                onClick={() => setActiveTab('url')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
                  activeTab === 'url'
                    ? 'bg-yellow-500 text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={activeTab === 'url'}
                tabIndex={0}
                type="button"
                disabled={loading}
              >
                <Link className="h-4 w-4" />
                <span>Analyze by URL</span>
              </button>
              <button
                onClick={() => setActiveTab('text')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 ${
                  activeTab === 'text'
                    ? 'bg-yellow-500 text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={activeTab === 'text'}
                tabIndex={0}
                type="button"
                disabled={loading}
              >
                <FileText className="h-4 w-4" />
                <span>Analyze by Text</span>
              </button>
            </div>
          </div>

          {/* Search Input and CTA */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder={activeTab === 'text' ? 'Paste YouTube terms or policy text here for scan...' : 'Enter YouTube Video URL for scan...'}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                className="h-12 text-base bg-white"
                aria-label={activeTab === 'text' ? 'Analyze by Text' : 'Analyze by URL'}
                disabled={loading}
              />
            </div>
            <Button size="lg" className="h-12 px-8 btn-hover w-[130px]" type="button" onClick={handleScan} disabled={loading || !searchValue.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {activeTab === 'text' ? (loading ? 'Scanning...' : 'Scan Text') : (loading ? 'Scanning...' : 'Scan URL')}
            </Button>
          </div>
          {error && <div className="text-red-600 text-sm mt-2 text-center">{error}</div>}
        </div>
      </div>
      {/* Floating Expand Button (overlays bar when collapsed) */}
      {collapsed && (
        <div>
          {/* Mobile: bottom-right icon button */}
          <button
            className="fixed bottom-6 right-6 z-50 bg-yellow-500 text-gray-900 rounded-full shadow-lg p-4 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400 md:hidden"
            aria-label="Expand search bar"
            onClick={handleExpand}
            tabIndex={0}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
          >
            <Search className="h-6 w-6" />
          </button>
          {/* Desktop: centered button with gradient stroke, white fill, yellow text */}
          <div className="hidden md:flex fixed bottom-6 left-0 right-0 z-50 justify-center pointer-events-none">
            <div className="bg-gradient-to-r from-yellow-400 to-black p-[2px] rounded-full pointer-events-auto">
              <Button
                size="lg"
                className="btn-hover px-8 py-4 text-lg font-semibold bg-white rounded-full text-black border-0 shadow-lg flex items-center justify-center hover:bg-gray-50 focus:ring-2 focus:ring-yellow-400"
                onClick={handleExpand}
                aria-label={activeTab === 'text' ? 'Expand and scan text' : 'Expand and scan video'}
                type="button"
                style={{ minWidth: '220px' }}
              >
                <Search className="h-5 w-5 mr-2 text-black" />
                {activeTab === 'text' ? 'Scan Text' : 'Scan Video'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StickySearchBar; 
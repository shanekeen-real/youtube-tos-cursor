"use client";
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { AuthContext } from '@/lib/imports';
import { Button } from '@/lib/imports';
import { Card } from '@/lib/imports';
import { Badge } from '@/lib/imports';
import { ProgressMeter, FeatureGrid, type FeatureSet } from '@/lib/imports';
import { SUBSCRIPTION_TIERS } from '@/types/subscription';
import { UIInput as Input } from '@/lib/imports';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToastContext } from '@/contexts/ToastContext';
import { EnhancedAnalysisResult } from '@/types/analysis';
import PricingSection from './pricing/PricingSection';
import StaticPricingSection from './pricing/StaticPricingSection';
import Logo from '../components/Logo';
import StickySearchBar from '@/components/StickySearchBar';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import BenefitsSection from '@/components/BenefitsSection';
import ComparisonSection from '@/components/ComparisonSection';
import FAQSection from '@/components/FAQSection';
import Footer from '@/components/Footer';
import ScanProgressModal from '../components/ScanProgressModal';

const featureSets: FeatureSet[] = [
  {
    title: 'Free',
    features: SUBSCRIPTION_TIERS.free.features.map(label => ({ label })),
  },
  {
    title: 'Pro',
    features: SUBSCRIPTION_TIERS.pro.features.map(label => ({ label })),
    recommended: true,
    badgeText: 'Most Popular',
    badgeColor: 'yellow',
  },
  {
    title: 'Advanced',
    features: SUBSCRIPTION_TIERS.advanced.features.map(label => ({ label })),
  },
  {
    title: 'Enterprise',
    features: SUBSCRIPTION_TIERS.enterprise.features.map(label => ({ label })),
  },
];

const ProgressBar = ({ progress, rainbow = false }: { progress: number; rainbow?: boolean }) => (
  <div className="w-full h-2 bg-gray-200 rounded-xl overflow-hidden mb-6">
    <div
      className={rainbow ? "h-full transition-all duration-200" : "h-full bg-yellow-500 transition-all duration-200"}
      style={{
        width: `${progress}%`,
        background: rainbow
          ? 'linear-gradient(90deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #cc00ff)'
          : undefined,
      }}
    />
  </div>
);

export default function Home() {
  const auth = useContext(AuthContext);
  const { showError, showSuccess } = useToastContext();
  const [analysisType, setAnalysisType] = useState('text'); // 'text' or 'url'
  const [inputValue, setInputValue] = useState('');
  const [loadingFree, setLoadingFree] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [freeScanResult, setFreeScanResult] = useState<EnhancedAnalysisResult | null>(null);
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanModalThumbnail, setScanModalThumbnail] = useState<string | null>(null);
  const [scanModalTitle, setScanModalTitle] = useState<string | null>(null);

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

  useEffect(() => {
    let interval = 400;
    let minInc = 0.5, maxInc = 1.2;
    if (loadingFull && !loadingFree) {
      interval = 60;
      minInc = 2.1;
      maxInc = 2.1;
    }

    if (loadingFree || loadingFull) {
      setProgress(0);
      let pct = 0;
      progressRef.current = setInterval(() => {
        pct += Math.random() * (maxInc - minInc) + minInc;
        if (pct >= 100) pct = 100;
        setProgress(pct);
        if (pct === 100 && progressRef.current) {
          clearInterval(progressRef.current);
        }
      }, interval);
    } else {
      setProgress(0);
      if (progressRef.current) clearInterval(progressRef.current);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [loadingFree, loadingFull]);

  const handleFullReport = async () => {
    if (!inputValue.trim()) return;
    if (!auth?.user) {
      auth?.setAuthOpen(true);
      return;
    }
    
    let thumbnail = '';
    let title = '';
    if (analysisType === 'url') {
      const meta = await fetchYouTubeThumbnailAndTitle(inputValue);
      thumbnail = meta.thumbnail;
      title = meta.title;
    }
    
    setScanModalThumbnail(thumbnail);
    setScanModalTitle(title);
    setShowScanModal(true);
    setLoadingFull(true);
    
    try {
      const isUrl = analysisType === 'url';
      
      if (isUrl) {
        // Add to queue for URL scans
        const response = await fetch('/api/queue/add-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            url: inputValue,
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
          showSuccess('Scan Added to Queue', 'Your video has been added to the scan queue and will be processed in the background. You can check the status in your queue anytime.');
        }, 1000);
        
      } else {
        // Direct processing for text/policy scans (keep existing flow)
        const endpoint = '/api/analyze-policy';
        const payload = { text: inputValue };
        const res = await axios.post(endpoint, payload);
        setTimeout(() => {
          setShowScanModal(false);
          router.push(`/results?scanId=${res.data.scanId}`);
        }, 1000);
      }
    } catch (e: unknown) {
      setShowScanModal(false);
      if (e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'status' in e.response) {
        const response = e.response as { status: number; data?: { error?: string; existingQueueId?: string; existingStatus?: string; existingProgress?: number } };
        if (response.status === 400) {
          showError('Analysis Error', response.data?.error || 'Bad request');
        } else if (response.status === 409) {
          const errorDetails = response.data?.existingQueueId 
            ? `${response.data.error} (Status: ${response.data.existingStatus}, Progress: ${response.data.existingProgress}%). You can view your queue to check the status.`
            : response.data?.error || 'This video is already in your scan queue.';
          
          // Add a "View Queue" action button if we have queue details
          const action = response.data?.existingQueueId ? (
            <button
              onClick={() => router.push('/queue')}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              View Queue
            </button>
          ) : undefined;
          
          showError('Scan Already Exists', errorDetails, action);
        } else if (response.status === 429) {
          const errorMessage = response.data?.error || 'Rate limit exceeded. Please try again later.';
          showError('Rate Limit Exceeded', errorMessage);
        } else {
          showError('Analysis Error', 'Error analyzing content. Please try again.');
        }
      } else if (e instanceof Error) {
        showError('Analysis Error', e.message);
      } else {
        showError('Analysis Error', 'Error analyzing content. Please try again.');
      }
    } finally {
      setLoadingFull(false);
    }
  };

  const handleFreeScan = async () => {
    if (!inputValue.trim()) return;
    if (!auth?.user) {
      auth?.setAuthOpen(true);
      return;
    }
    setLoadingFree(true);
    try {
      const res = await axios.post('/api/analyze-policy', { text: inputValue });
      
      // The scan is now automatically saved by the server-side API
      // No need to manually save to Firestore here
      
      setFreeScanResult(res.data as EnhancedAnalysisResult);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'response' in e && e.response && typeof e.response === 'object' && 'status' in e.response) {
        const response = e.response as { status: number; data?: { error?: string } };
        if (response.status === 400) {
          showError('Analysis Error', response.data?.error || 'Bad request');
        } else if (response.status === 429) {
          // Display the actual error message from the backend instead of generic message
          const errorMessage = response.data?.error || 'Rate limit exceeded. Please try again later.';
          showError('Rate Limit Exceeded', errorMessage);
        } else {
          showError('Analysis Error', 'Error analyzing policy. Please try again.');
        }
      } else {
        showError('Analysis Error', 'Error analyzing policy. Please try again.');
      }
    } finally {
      setLoadingFree(false);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    if (riskLevel === 'HIGH') return <AlertTriangle className="h-6 w-6 text-risk" />;
    if (riskLevel === 'MEDIUM') return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    return <CheckCircle className="h-6 w-6 text-safe" />;
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="flex flex-col items-center w-full">
        {/* Mobile-only container for screens below 600px */}
        <div className="w-full max-w-[300px] mx-auto px-2 md:hidden relative">
          <HeroSection />
          <FeaturesSection />
          <BenefitsSection />
          <ComparisonSection />
          <div className="h-48" />
          <section id="pricing-section" className="w-full">
            <StaticPricingSection />
          </section>
          <FAQSection />
        </div>
        
        {/* Desktop container for screens 600px and above */}
        <div className="hidden md:block w-full relative">
          <div className="w-full px-1 xs:px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 2xl:px-[100px] max-w-7xl mx-auto">
          <HeroSection />
          <FeaturesSection />
          <BenefitsSection />
          <ComparisonSection />
          <div className="h-48" />
          <section id="pricing-section" className="w-full">
            <StaticPricingSection />
          </section>
          <FAQSection />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
      <StickySearchBar />
    </div>
  );
}

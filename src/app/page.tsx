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
    setLoadingFull(true);
    try {
      const isUrl = analysisType === 'url';
      const endpoint = isUrl ? '/api/analyze-url' : '/api/analyze-policy';
      const payload = isUrl ? { url: inputValue } : { text: inputValue };
      
      const res = await axios.post(endpoint, payload);
      
      // The scan is now automatically saved by the server-side API
      // No need to manually save to Firestore here
      
      router.push(`/results?scanId=${res.data.scanId}`);
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
          showError('Analysis Error', 'Error analyzing content. Please try again.');
        }
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
      <main className="flex flex-col items-center px-4 py-12">
        {/* Hero Section */}
        <HeroSection />
        {/* Add vertical space before pricing section */}
        <div className="h-48" />
        {/* Feature Grid */}
        <section id="pricing-section" className="w-full max-w-6xl">
          <StaticPricingSection />
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full flex flex-col items-center mt-16 mb-8 text-caption text-gray-500">
        <div className="flex gap-4 mb-2">
          <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500 transition-colors">
            Privacy Policy
          </a>
          <span>|</span>
          <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-500 transition-colors">
            Terms of Service
          </a>
        </div>
        <div>&copy; {new Date().getFullYear()} Yellow Dollar. Effective July 3rd, 2025.</div>
      </footer>
      <StickySearchBar />
    </div>
  );
}

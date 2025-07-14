"use client";
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { AuthContext } from '@/components/ClientLayout';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import ProgressMeter from '@/components/ProgressMeter';
import FeatureGrid, { FeatureSet } from '../components/FeatureGrid';
import { SUBSCRIPTION_TIERS } from '@/types/subscription';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToastContext } from '@/contexts/ToastContext';

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
  const [freeScanResult, setFreeScanResult] = useState<any | null>(null);
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
    } catch (e: any) {
       if (e.response && e.response.status === 400) {
        showError('Analysis Error', e.response.data.error);
      } else if (e.response && e.response.status === 429) {
        // Display the actual error message from the backend instead of generic message
        const errorMessage = e.response.data.error || 'Rate limit exceeded. Please try again later.';
        showError('Rate Limit Exceeded', errorMessage);
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
      
      setFreeScanResult({
        risk_score: res.data.risk_score,
        flagged_section: res.data.flagged_section,
        risk_level: res.data.risk_level,
        highlights: res.data.highlights
      });
    } catch (e: any) {
      if (e.response && e.response.status === 400) {
        showError('Analysis Error', e.response.data.error);
      } else if (e.response && e.response.status === 429) {
        // Display the actual error message from the backend instead of generic message
        const errorMessage = e.response.data.error || 'Rate limit exceeded. Please try again later.';
        showError('Rate Limit Exceeded', errorMessage);
      } else {
        showError('Analysis Error', 'Error analyzing policy. Please try again.');
      }
    } finally {
      setLoadingFree(false);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    if (riskLevel === 'high') return <AlertTriangle className="h-6 w-6 text-risk" />;
    if (riskLevel === 'medium') return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    return <CheckCircle className="h-6 w-6 text-safe" />;
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="flex flex-col items-center px-4 py-12">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center mb-16 max-w-4xl">
          <div className="mb-8">
            <Shield className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-display font-bold text-gray-900 mb-6">
              Protect Your YouTube Revenue from <span className="text-risk">Demonetization</span>
            </h1>
            <p className="text-subtitle text-gray-600 max-w-2xl mx-auto">
              Analyze YouTube policies and video content instantly. Get AI-powered risk assessment and fix recommendations.
            </p>
          </div>

          {/* Analysis Card */}
          <Card className="w-full max-w-2xl">
            <div className="w-full flex mb-6">
              <button 
                onClick={() => { setAnalysisType('text'); setInputValue(''); }}
                className={`flex-1 py-3 px-6 rounded-l-xl text-body font-semibold focus:outline-none transition-colors ${
                  analysisType === 'text' 
                    ? 'bg-yellow-500 text-gray-900' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Analyze by Text
              </button>
              <button 
                onClick={() => { setAnalysisType('url'); setInputValue(''); }}
                className={`flex-1 py-3 px-6 rounded-r-xl text-body font-semibold focus:outline-none transition-colors ${
                  analysisType === 'url' 
                    ? 'bg-yellow-500 text-gray-900' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Analyze by URL
              </button>
            </div>

            <label htmlFor="tos-input" className="text-body font-semibold mb-3 w-full text-left text-gray-900 block">
              Content to analyze
            </label>
            {analysisType === 'text' ? (
              <textarea
                id="tos-input"
                placeholder="Paste YouTube Terms or Policy text here..."
                className="w-full h-32 border border-gray-200 rounded-xl p-4 mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white text-gray-900 text-body"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={loadingFree || loadingFull}
              />
            ) : (
              <Input
                id="url-input"
                type="url"
                placeholder="Enter YouTube video URL..."
                className="mb-6"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                disabled={loadingFree || loadingFull}
              />
            )}

            {(loadingFree || loadingFull) && (
              <ProgressBar progress={progress} rainbow={loadingFull} />
            )}
            
            <div className="flex w-full gap-4">
              <Button 
                variant="secondary" 
                className="flex-1" 
                onClick={handleFreeScan} 
                disabled={loadingFree || loadingFull || !inputValue.trim() || analysisType === 'url'}
                title={analysisType === 'url' ? "Free scan not available for URLs" : ""}
              >
                {loadingFree ? 'Scanning...' : 'Free Scan'}
              </Button>
              <Button 
                variant="primary" 
                className="flex-1" 
                onClick={handleFullReport} 
                disabled={loadingFull || loadingFree || !inputValue.trim()}
              >
                {loadingFull ? 'Analyzing...' : 'Full Report'}
              </Button>
            </div>
          </Card>

          {/* Free Scan Results */}
          {freeScanResult && (
            <div className="w-full max-w-2xl mt-8 flex flex-col gap-6">
              <Card>
                <div className="flex items-center justify-center mb-4">
                  {getRiskIcon(freeScanResult.risk_level)}
                </div>
                <div className="text-display font-bold text-gray-900 text-center mb-2">
                  {freeScanResult.risk_score}%
                </div>
                <div className="text-body text-gray-600 text-center mb-4">
                  {freeScanResult.flagged_section}
                </div>
                <Badge 
                  variant={freeScanResult.risk_level === 'high' ? 'risk' : 
                          freeScanResult.risk_level === 'medium' ? 'neutral' : 'safe'}
                  className="mx-auto"
                >
                  {freeScanResult.risk_level.toUpperCase()} RISK
                </Badge>
              </Card>
              
              <Card title="Policy Analysis">
                <textarea
                  className="w-full h-20 border border-gray-200 rounded-xl p-4 resize-none bg-gray-50 text-gray-900 text-body"
                  value={inputValue}
                  readOnly
                />
              </Card>
            </div>
          )}
        </section>

        {/* Feature Grid */}
        <section className="w-full max-w-6xl">
          <h2 className="text-title font-semibold text-gray-900 text-center mb-12">
            Choose Your Protection Plan
          </h2>
          <FeatureGrid sets={featureSets} />
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
    </div>
  );
}

"use client";
import React, { useContext, useState, useRef, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import FeatureGrid, { FeatureSet } from '../components/FeatureGrid';
import { AuthContext } from '../components/ClientLayout';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const featureSets: FeatureSet[] = [
  {
    title: 'Free Scan',
    features: [
      { label: 'Basic risk detection', checked: true },
      { label: 'Policy highlighting', checked: true },
      { label: 'Risk score overview', checked: true },
      { label: 'Detailed suggestions', muted: true },
      { label: 'Revenue impact', muted: true },
    ],
  },
  {
    title: 'Full Report ($5)',
    features: [
      { label: 'Advanced AI analysis', checked: true },
      { label: 'Detailed risk breakdown', checked: true },
      { label: 'Actionable fix suggestions', checked: true },
      { label: 'Revenue impact estimate', checked: true },
      { label: 'Export & share results', checked: true },
    ],
    recommended: true,
    badgeText: 'Recommended',
    badgeColor: 'blue',
  },
  {
    title: 'Enterprise',
    features: [
      { label: 'Bulk analysis', checked: true },
      { label: 'Team collaboration', checked: true },
      { label: 'Priority support', checked: true },
      { label: 'Custom integrations', checked: true },
      { label: 'Contact Sales', link: '#' },
    ],
  },
];

const ProgressBar = ({ progress, rainbow = false }: { progress: number; rainbow?: boolean }) => (
  <div className="w-full h-2 bg-gray-200 rounded overflow-hidden mb-4">
    <div
      className={rainbow ? "h-full transition-all duration-200" : "h-full bg-red-500 transition-all duration-200"}
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
  const [input, setInput] = useState('');
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
    if (!input.trim()) return;
    setLoadingFull(true);
    try {
      await new Promise(res => setTimeout(res, 3000)); // ensure loading bar is visible for 3s
      const res = await axios.post('/api/analyze-policy?mode=free', { text: input });
      router.push(`/results?data=${encodeURIComponent(JSON.stringify({ ...res.data, input }))}`);
    } catch (e) {
      alert('Error analyzing policy. Please try again.');
    } finally {
      setLoadingFull(false);
    }
  };

  const handleFreeScan = async () => {
    if (!input.trim()) return;
    setLoadingFree(true);
    try {
      // Simulate a basic scan (just risk score and policy analysis)
      setTimeout(() => {
        setFreeScanResult({
          risk_score: 73,
          flagged_section: 'Section 4.3 - High demonetization risk detected',
        });
        setLoadingFree(false);
      }, 4000); // match slow progress bar
    } catch (e) {
      alert('Error analyzing policy. Please try again.');
      setLoadingFree(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8 font-sans">
      {/* Hero */}
      <section className="flex flex-col items-center text-center mb-10 bg-white">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#212121] mb-2">
          Protect Your YouTube Channel from <span className="text-red-600">Demonetization</span>
        </h1>
        <p className="text-lg text-[#212121] max-w-2xl mb-8">
          Paste YouTube's policies to discover risks instantly. Get fix advice with AI.
        </p>
        <Card className="w-full max-w-xl flex flex-col items-center border border-gray-200">
          <label htmlFor="tos-input" className="font-semibold mb-2 w-full text-left text-[#212121]">Content to analyze</label>
          <textarea
            id="tos-input"
            placeholder="Paste YouTube Terms or Policy text here..."
            className="w-full h-32 border border-gray-300 rounded-lg p-3 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 bg-[#FAFAFA] text-[#212121]"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={loadingFree || loadingFull}
          />
          {(loadingFree || loadingFull) && (
            <ProgressBar progress={progress} rainbow={loadingFull} />
          )}
          <div className="flex w-full gap-4">
            <Button variant="secondary" className="flex-1 flex items-center justify-center" onClick={handleFreeScan} disabled={loadingFree || loadingFull || !input.trim()}>
              {loadingFree ? 'Scanning...' : 'Free Scan'}
            </Button>
            <Button variant="blue" className="flex-1 flex items-center justify-center" onClick={handleFullReport} disabled={loadingFull || loadingFree || !input.trim()}>
              {loadingFull ? 'Scanning...' : 'Full Report ($5)'}
            </Button>
          </div>
        </Card>
        {freeScanResult && (
          <div className="w-full max-w-xl mt-8 flex flex-col gap-6">
            <Card className="flex flex-col items-center border border-gray-200">
              <div className="text-5xl font-bold text-red-600 mb-2">{freeScanResult.risk_score}%</div>
              <div className="text-sm text-[#606060] mb-2">{freeScanResult.flagged_section}</div>
            </Card>
            <Card className="border border-gray-200">
              <div className="font-semibold mb-2">Policy Analysis</div>
              <textarea
                className="w-full h-20 border border-gray-300 rounded-lg p-3 mb-2 resize-none bg-[#FAFAFA] text-[#212121]"
                value={input}
                readOnly
              />
            </Card>
          </div>
        )}
      </section>
      {/* Feature Grid */}
      <FeatureGrid sets={featureSets} />
    </main>
  );
}

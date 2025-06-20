"use client";
import React, { useState, useEffect, useContext, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../../lib/firebase';
import { AuthContext } from '../../components/ClientLayout';
import Card from '../../components/Card';
import ProgressMeter from '../../components/ProgressMeter';
import Badge from '../../components/Badge';
import Accordion from '../../components/Accordion';
import Button from '../../components/Button';

// Define a type for our scan data for better type safety
interface ScanData {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  flagged_section: string;
  suggestions: { title: string; text: string }[];
  highlights: { category: string, risk: string, score: number }[];
  originalText?: string;
  input?: string; // from the old data structure
}

function ResultsPageContent() {
  const params = useSearchParams();
  const authContext = useContext(AuthContext);
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const scanId = params.get('scanId');
      const directData = params.get('data');

      if (scanId) {
        if (!authContext?.user) {
          setError('Authentication required to view scan details.');
          setLoading(false);
          return;
        }
        try {
          const db = getFirestore(app);
          const scanDoc = await getDoc(doc(db, 'scans', scanId));
          
          if (!scanDoc.exists()) {
            setError('Scan not found.');
            setLoading(false);
            return;
          }
          
          const scanData = scanDoc.data();
          
          // Security check: ensure the user owns this scan
          if (scanData.userId !== authContext.user.uid) {
            setError('Unauthorized access to scan.');
            setLoading(false);
            return;
          }
          
          setData(scanData as ScanData);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch scan details.');
        } finally {
          setLoading(false);
        }
      } else if (directData) {
        try {
          const parsedData = JSON.parse(directData);
          setData(parsedData);
        } catch {
          setError('Failed to parse scan data.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('No scan data provided.');
        setLoading(false);
      }
    };

    fetchData();
  }, [params, authContext?.user]);
  
  if (loading) {
    return <div className="text-center py-10">Loading results...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }
  
  if (!data) {
    return <div className="text-center py-10">No data available for this scan.</div>;
  }
  
  const getRiskBadgeColor = (level: string) => {
    if (level?.toLowerCase() === 'high') return 'red';
    if (level?.toLowerCase() === 'medium') return 'yellow';
    return 'green';
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-5xl flex justify-center mb-8 gap-2">
        <Button variant="outlined" className="h-9 px-6 flex items-center justify-center">Share</Button>
        <Button variant="outlined" className="h-9 px-6 flex items-center justify-center">Export</Button>
      </div>
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
        {/* Left: Risk Score & Summary */}
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-center border border-gray-200">
            <div className="text-5xl font-bold text-red-600 mb-2">{data.risk_score ?? '--'}%</div>
            {data.risk_level && <Badge color={getRiskBadgeColor(data.risk_level)} className="mb-2">{data.risk_level.toUpperCase()} RISK</Badge>}
            <div className="text-sm text-[#606060] mb-2">{data.flagged_section}</div>
            {data.risk_score && <ProgressMeter value={data.risk_score} color="red" label="Overall Risk Score" />}
          </Card>
          <Card className="border border-gray-200">
            <div className="font-semibold mb-2">Revenue Impact</div>
            <div className="text-3xl font-bold text-red-600">$2,847</div>
            <div className="text-xs text-[#606060]">Estimated monthly revenue at risk</div>
          </Card>
          <Card className="border border-gray-200">
            <div className="font-semibold mb-2">Quick Fixes</div>
            <div className="flex flex-col gap-2">
              <Button variant="secondary" className="w-full">High-Risk Content Detection</Button>
              <Button variant="secondary" className="w-full">Thumbnail Compliance</Button>
            </div>
          </Card>
        </div>
        {/* Right: Policy Analysis & Suggestions */}
        <div className="flex flex-col gap-6">
          <Card className="border border-gray-200">
            <div className="font-semibold mb-2">Policy Analysis</div>
            <textarea
              className="w-full h-20 border border-gray-300 rounded-lg p-3 mb-2 resize-none bg-[#FAFAFA] text-[#212121]"
              value={data.originalText || data.input || ''}
              readOnly
            />
            <div className="flex gap-2 mt-2">
              {data.highlights?.map((h, i) => (
                 <Badge key={i} color={getRiskBadgeColor(h.risk)}>{h.category}</Badge>
              ))}
            </div>
          </Card>
          {data.suggestions && (
            <Card className="border border-gray-200">
              <div className="font-semibold mb-2">Actionable Suggestions</div>
              {data.suggestions.map((s, i) => (
                <Accordion key={i} title={s.title} defaultOpen={i === 0}>
                  {s.text}
                </Accordion>
              ))}
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <ResultsPageContent />
    </Suspense>
  );
} 
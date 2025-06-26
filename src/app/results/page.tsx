"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Link from 'next/link';
import { Suspense } from "react";

interface ScanData {
  id?: string;
  url?: string;
  title?: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  flaggedSections: string[];
  suggestions: any[];
  createdAt?: string;
  userId?: string;
  // Enhanced fields
  context_analysis?: {
    content_type: string;
    target_audience: string;
    monetization_impact: number;
    content_length: number;
    language_detected: string;
  };
  policy_categories?: {
    [category: string]: {
      risk_score: number;
      confidence: number;
      violations: string[];
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      explanation: string;
    };
  };
  highlights?: {
    category: string;
    risk: string;
    score: number;
    confidence: number;
  }[];
  analysis_metadata?: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: string;
  };
  analyzed_content?: string;
  analysis_source?: string;
}

function toArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  if (typeof val === 'string') return [val];
  return Array.from(val);
}

function ResultsPageContent() {
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'suggestions'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const scanId = params.get('scanId');
      const directData = params.get('data');

      if (scanId) {
        if (!session?.user?.id) {
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
          if (scanData.userId !== session.user.id) {
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
  }, [params, session?.user?.id]);

  const getRiskColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW': return 'green';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'red';
      default: return 'gray';
    }
  };

  const severityOrder = { HIGH: 2, MEDIUM: 1, LOW: 0 };

  if (status === 'loading' || loading) {
    return (
      <div className="text-center py-10">
        <p>Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500 mb-4">No data available.</p>
        <Link href="/">
          <Button>Back to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#212121] mb-2">Scan Results</h1>
        <p className="text-gray-600">Analysis results for your content</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <h3 className="text-lg font-semibold mb-2">Risk Level</h3>
          <Badge color={getRiskColor(data.riskLevel)} className="text-lg">
            {data.riskLevel} Risk
          </Badge>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-2">Risk Score</h3>
          <div className="text-3xl font-bold text-[#212121]">{data.riskScore}/100</div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-2">Content Title</h3>
          <p className="text-gray-600 truncate">{data.title}</p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8 relative">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Details' },
              { id: 'suggestions', label: 'Suggestions' }
            ].map((tab) => (
              <div key={tab.id} className="relative">
                <button
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
                {tab.id === 'suggestions' && toArray(data.suggestions).length > 0 && (
                  <span
                    className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold"
                    style={{ width: 20, height: 20, lineHeight: '20px' }}
                  >
                    {toArray(data.suggestions).length}
                  </span>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="min-h-[400px]">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <p className="text-gray-600 mb-4">
                This content has been analyzed for potential Terms of Service violations, copyright and demonetization risks.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Key Findings:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Risk Level: {data.riskLevel}</li>
                  <li>Risk Score: {data.riskScore}/100</li>
                  <li>Flagged Sections: {toArray(data.flaggedSections).length}</li>
                  <li>Suggestions Provided: {toArray(data.suggestions).length}</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Content Analysis + Highlights + Analyzed Content */}
              <div className="flex flex-col gap-6">
                {/* Content Analysis Card */}
                {data.context_analysis && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Content Analysis</h3>
                    <div className="mb-4">
                      <textarea
                        className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700 mb-2"
                        value={data.url || ''}
                        readOnly
                        rows={2}
                        style={{ resize: 'none' }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">
                        {data.context_analysis.content_type?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        {data.context_analysis.target_audience?.toUpperCase() || 'GENERAL'}
                      </span>
                      <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                        MONETIZATION {data.context_analysis.monetization_impact || 0}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Language: <span className="font-medium text-gray-800">{data.context_analysis.language_detected}</span></div>
                      <div>Content Length: <span className="font-medium text-gray-800">{data.context_analysis.content_length} words</span></div>
                    </div>
                  </div>
                )}
                {/* Highlights Card */}
                {data.highlights && data.highlights.length > 0 && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Risk Highlights</h3>
                    <div className="flex flex-wrap gap-3">
                      {data.highlights.map((h, i) => (
                        <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 min-w-[160px] flex-1">
                          <div className="font-semibold text-yellow-800 mb-1">{h.category}</div>
                          <div className="text-xs text-gray-500 mb-1">Risk: {h.risk}</div>
                          <div className="text-xs text-gray-500 mb-1">Score: {h.score}</div>
                          <div className="text-xs text-gray-500">Confidence: {h.confidence}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Analyzed Content Card */}
                {data.analyzed_content && (
                  <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Analyzed Content (Title & Description)</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 whitespace-pre-line text-sm text-gray-800 max-h-48 overflow-auto">
                      {data.analyzed_content}
                    </div>
                  </div>
                )}
                {/* Metadata Card (mobile only, or at bottom on desktop) */}
                {data.analysis_metadata && (
                  <div className="bg-white rounded-xl shadow p-6 lg:hidden">
                    <h3 className="text-lg font-semibold mb-4">Analysis Metadata</h3>
                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                      <div>Model Used: <span className="font-medium">{data.analysis_metadata.model_used}</span></div>
                      <div>Timestamp: <span className="font-medium">{new Date(data.analysis_metadata.analysis_timestamp).toLocaleString()}</span></div>
                      <div>Processing Time: <span className="font-medium">{data.analysis_metadata.processing_time_ms} ms</span></div>
                      <div>Content Length: <span className="font-medium">{data.analysis_metadata.content_length} chars</span></div>
                      <div>Mode: <span className="font-medium">{data.analysis_metadata.analysis_mode}</span></div>
                    </div>
                  </div>
                )}
              </div>
              {/* Right column: Policy Category Analysis + Metadata (desktop) */}
              <div className="flex flex-col gap-6">
                {/* Policy Category Analysis Table */}
                {data.policy_categories && Object.keys(data.policy_categories).length > 0 && (
                  <div className="bg-white rounded-xl shadow p-6" style={{ maxHeight: '420px', minHeight: '320px', overflowY: 'auto', overflowX: 'hidden' }}>
                    <h3 className="text-lg font-semibold mb-4">Policy Category Analysis</h3>
                    <div className="flex flex-col gap-4">
                      {Object.entries(data.policy_categories)
                        .sort((a, b) => {
                          if (b[1].risk_score !== a[1].risk_score) {
                            return b[1].risk_score - a[1].risk_score;
                          }
                          return (severityOrder[b[1].severity] || 0) - (severityOrder[a[1].severity] || 0);
                        })
                        .map(([cat, val]: any) => (
                          <div key={cat} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            {/* Line 1: Policy Title left, Risk Score & Tag right */}
                            <div className="flex flex-wrap items-center justify-between mb-1 w-full">
                              <span className="font-semibold text-base truncate max-w-[60%]">{cat.replace(/_/g, ' ')}</span>
                              <span className="flex items-center gap-2 ml-auto">
                                <span className="text-sm font-medium text-gray-700">{val.risk_score}%</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${val.severity === 'HIGH' ? 'bg-red-100 text-red-700' : val.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{val.severity} Risk</span>
                              </span>
                            </div>
                            {/* Line 2: Confidence score */}
                            <div className="text-xs text-gray-500 mb-1">Confidence score: {val.confidence}%</div>
                            {/* Line 3: Violations or move analysis up if none */}
                            {val.violations && val.violations.length > 0 ? (
                              <div className="text-xs text-red-600 mb-1">{val.violations.join(', ')}</div>
                            ) : null}
                            {/* Line 4: Analysis paragraph (move up if no violations) */}
                            <div className={`text-sm text-gray-800 ${(!val.violations || val.violations.length === 0) ? '' : 'mt-1'}`}>{val.explanation}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {/* Metadata Card (desktop only) */}
                {data.analysis_metadata && (
                  <div className="bg-white rounded-xl shadow p-6 hidden lg:block">
                    <h3 className="text-lg font-semibold mb-4">Analysis Metadata</h3>
                    <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                      <div>Model Used: <span className="font-medium">{data.analysis_metadata.model_used}</span></div>
                      <div>Timestamp: <span className="font-medium">{new Date(data.analysis_metadata.analysis_timestamp).toLocaleString()}</span></div>
                      <div>Processing Time: <span className="font-medium">{data.analysis_metadata.processing_time_ms} ms</span></div>
                      <div>Content Length: <span className="font-medium">{data.analysis_metadata.content_length} chars</span></div>
                      <div>Mode: <span className="font-medium">{data.analysis_metadata.analysis_mode}</span></div>
                    </div>
                  </div>
                )}
              </div>
              {/* Fallback: If no enhanced details, show flagged sections as before */}
              {!data.context_analysis && !data.policy_categories && (
                <div className="col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Flagged Sections</h3>
                  {toArray(data.flaggedSections).length > 0 ? (
                    <div className="space-y-4">
                      {toArray(data.flaggedSections).map((section, index) => (
                        <div key={index} className="border border-red-200 bg-red-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-red-800 mb-2">Flagged Section {index + 1}</h4>
                          <p className="text-red-700">{section}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No specific sections were flagged in this analysis.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
              {toArray(data.suggestions).length > 0 ? (
                <div className="space-y-4">
                  {toArray(data.suggestions).map((suggestion, index) => (
                    <div key={index} className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">
                        Suggestion {index + 1}: {suggestion.title}
                      </h4>
                      <p className="text-blue-700 mb-1">{suggestion.text}</p>
                      <div className="text-xs text-gray-500">
                        Priority: {suggestion.priority} | Impact: {suggestion.impact_score}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No specific suggestions available for this content.</p>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="mt-8 flex justify-center space-x-4">
        <Link href="/">
          <Button variant="outlined">New Scan</Button>
        </Link>
        <Link href="/scan-history">
          <Button>View History</Button>
        </Link>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
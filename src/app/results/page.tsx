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

// Enhanced scan data interface
interface ScanData {
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  flagged_section: string;
  suggestions: { title: string; text: string; priority?: 'HIGH' | 'MEDIUM' | 'LOW'; impact_score?: number }[];
  highlights: { category: string, risk: string, score: number; confidence?: number }[];
  originalText?: string;
  input?: string;
  source?: 'youtube-url-analysis' | string;
  transcript?: string;
  analysis_source?: 'transcript' | 'metadata';
  analyzed_content?: string;
  // Enhanced analysis fields
  confidence_score?: number;
  policy_categories?: {
    [category: string]: {
      risk_score: number;
      confidence: number;
      violations: string[];
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      explanation: string;
    };
  };
  context_analysis?: {
    content_type: string;
    target_audience: string;
    monetization_impact: number;
    content_length: number;
    language_detected: string;
  };
  analysis_metadata?: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
  };
}

function ResultsPageContent() {
  const params = useSearchParams();
  const authContext = useContext(AuthContext);
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
  
  const isUrlAnalysis = data.source === 'youtube-url-analysis' || data.analysis_source;
  const isEnhancedAnalysis = data.confidence_score !== undefined;

  const getRiskBadgeColor = (level: string) => {
    if (level?.toLowerCase() === 'high') return 'red';
    if (level?.toLowerCase() === 'medium') return 'yellow';
    return 'green';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'red';
    if (priority === 'MEDIUM') return 'yellow';
    return 'green';
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-6xl flex justify-center mb-8 gap-2">
        <Button variant="outlined" className="h-9 px-6 flex items-center justify-center">Share</Button>
        <Button variant="outlined" className="h-9 px-6 flex items-center justify-center">Export</Button>
      </div>

      {/* Tab Navigation */}
      <div className="w-full max-w-6xl mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Detailed Analysis
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'suggestions'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Suggestions
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Risk Score Card */}
          <Card className="flex flex-col items-center border border-gray-200">
            <div className="text-5xl font-bold text-red-600 mb-2">{data.risk_score ?? '--'}%</div>
            {data.risk_level && <Badge color={getRiskBadgeColor(data.risk_level)} className="mb-2">{data.risk_level.toUpperCase()} RISK</Badge>}
            <div className="text-sm text-[#606060] mb-2 text-center">{data.flagged_section}</div>
            {data.risk_score && <ProgressMeter value={data.risk_score} color="red" label="Overall Risk Score" />}
            
            {/* Confidence Score */}
            {isEnhancedAnalysis && data.confidence_score && (
              <div className="mt-4 w-full">
                <div className="flex justify-between text-sm mb-1">
                  <span>Analysis Confidence</span>
                  <span className={`font-semibold text-${getConfidenceColor(data.confidence_score)}-600`}>
                    {data.confidence_score}%
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      getConfidenceColor(data.confidence_score) === 'green' ? 'bg-green-500' :
                      getConfidenceColor(data.confidence_score) === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${data.confidence_score}%` }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Context Analysis */}
          {isEnhancedAnalysis && data.context_analysis && (
            <Card className="border border-gray-200">
              <div className="font-semibold mb-4">Content Context</div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Content Type:</span>
                  <div className="font-medium">{data.context_analysis.content_type}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Target Audience:</span>
                  <div className="font-medium">{data.context_analysis.target_audience}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Monetization Impact:</span>
                  <div className="font-medium text-blue-600">{data.context_analysis.monetization_impact}%</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Language:</span>
                  <div className="font-medium">{data.context_analysis.language_detected}</div>
                </div>
              </div>
            </Card>
          )}

          {/* Analysis Metadata */}
          {isEnhancedAnalysis && data.analysis_metadata && (
            <Card className="border border-gray-200">
              <div className="font-semibold mb-4">Analysis Details</div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Model:</span>
                  <span className="ml-2 font-medium">{data.analysis_metadata.model_used}</span>
                </div>
                <div>
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="ml-2 font-medium">{data.analysis_metadata.processing_time_ms}ms</span>
                </div>
                <div>
                  <span className="text-gray-600">Content Length:</span>
                  <span className="ml-2 font-medium">{data.analysis_metadata.content_length} characters</span>
                </div>
                <div>
                  <span className="text-gray-600">Analyzed:</span>
                  <span className="ml-2 font-medium">
                    {new Date(data.analysis_metadata.analysis_timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Policy Analysis */}
          <Card className="border border-gray-200">
            <div className="font-semibold mb-4">Content Analysis</div>
            <textarea
              className="w-full h-32 border border-gray-300 rounded-lg p-3 mb-4 resize-none bg-[#FAFAFA] text-[#212121]"
              value={data.originalText || data.input || ''}
              readOnly
            />
            <div className="flex flex-wrap gap-2">
              {data.highlights?.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge color={getRiskBadgeColor(h.risk)}>{h.category}</Badge>
                  {h.confidence && (
                    <span className={`text-xs px-2 py-1 rounded ${
                      getConfidenceColor(h.confidence) === 'green' ? 'bg-green-100 text-green-800' :
                      getConfidenceColor(h.confidence) === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {h.confidence}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Policy Categories (Enhanced Analysis) */}
          {isEnhancedAnalysis && data.policy_categories && (
            <Card className="border border-gray-200">
              <div className="font-semibold mb-4">Policy Category Analysis</div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(data.policy_categories).map(([category, analysis]) => (
                  <div key={category} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{category.replace(/_/g, ' ')}</h4>
                      <div className="flex items-center gap-2">
                        <Badge color={getRiskBadgeColor(analysis.severity)}>
                          {analysis.severity}
                        </Badge>
                        <span className="text-xs text-gray-500">{analysis.risk_score}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mb-2">
                      Confidence: <span className={`font-medium text-${getConfidenceColor(analysis.confidence)}-600`}>
                        {analysis.confidence}%
                      </span>
                    </div>
                    {analysis.violations.length > 0 && (
                      <div className="text-xs text-red-600 mb-2">
                        <strong>Violations:</strong> {analysis.violations.join(', ')}
                      </div>
                    )}
                    <p className="text-xs text-gray-700">{analysis.explanation}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Analyzed Content (URL Analysis) */}
          {isUrlAnalysis && (
            <Card className="border border-gray-200 lg:col-span-2">
              <div className="font-semibold mb-2">
                {data.analysis_source === 'transcript' 
                  ? 'Analyzed Transcript' 
                  : 'Analyzed Content (Title & Description)'}
              </div>
              <textarea
                className="w-full h-64 border border-gray-300 rounded-lg p-3 text-sm resize-none bg-[#FAFAFA] text-[#212121]"
                value={data.analyzed_content || 'Content not available.'}
                readOnly
              />
              {data.analysis_source === 'metadata' && (
                <p className="text-xs text-gray-500 mt-2">
                  Transcript was not available, so the analysis was based on the video's title and description.
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="w-full max-w-4xl">
          <Card className="border border-gray-200">
            <div className="font-semibold mb-4">Actionable Suggestions</div>
            {data.suggestions && data.suggestions.length > 0 ? (
              <div className="space-y-4">
                {data.suggestions.map((s, i) => (
                  <Accordion 
                    key={i} 
                    title={`${s.title}${s.priority ? ` (${s.priority} Priority)` : ''}${s.impact_score ? ` - ${s.impact_score}% Impact` : ''}`}
                    defaultOpen={i === 0}
                  >
                    <div className="space-y-2">
                      {s.priority && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge color={getPriorityColor(s.priority)}>
                            {s.priority}
                          </Badge>
                          {s.impact_score && (
                            <span className="text-xs text-blue-600 font-medium">
                              {s.impact_score}% impact
                            </span>
                          )}
                        </div>
                      )}
                      {s.text}
                    </div>
                  </Accordion>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No suggestions available for this analysis.</p>
            )}
          </Card>
        </div>
      )}
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
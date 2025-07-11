"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';
import Link from 'next/link';
import { Suspense } from "react";
import ExportModal from '@/components/ExportModal';
import HighlightedTranscript from '@/components/HighlightedTranscript';
import { Download, Lock, AlertTriangle, CheckCircle, Clock, BarChart3, FileText, Target, Globe, Zap, Calendar, Settings, ArrowLeft, ExternalLink, ArrowRight, Shield, Check, Brain } from 'lucide-react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { checkUserCanExport } from '@/lib/subscription-utils';
import * as Tooltip from '@radix-ui/react-tooltip';
import he from 'he';
import { getTierLimits } from '@/types/subscription';

interface RiskSpan {
  text: string;
  start_index: number;
  end_index: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  policy_category: string;
  explanation: string;
}

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
  risky_spans?: RiskSpan[];
  analysis_metadata?: {
    model_used: string;
    analysis_timestamp: string;
    processing_time_ms: number;
    content_length: number;
    analysis_mode: string;
  };
  analyzed_content?: string;
  analysis_source?: string;
  allSuggestionsCount?: number;
  risky_phrases?: string[]; // Added risky_phrases to ScanData interface
  risky_phrases_by_category?: { [category: string]: string[] }; // Added risky_phrases_by_category to ScanData interface
  ai_detection?: {
    probability: number;
    confidence: number;
    patterns: string[];
    indicators: {
      personal_voice: number;
      natural_flow: number;
      grammar_consistency: number;
      structured_content: number;
    };
    explanation: string;
  };
}

function toArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  if (typeof val === 'string') return [val];
  return Array.from(val);
}

function ResultsPageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'suggestions'>('overview');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [canExport, setCanExport] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return;
      
      try {
        const db = getFirestore(app);
        const userRef = doc(db, 'users', session.user.id);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const profile = userDoc.data();
          setUserProfile(profile);
          
          // Check export permissions
          const exportCheck = checkUserCanExport(profile);
          setCanExport(exportCheck.canExport);
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    };

    fetchUserProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const scanId = searchParams.get('scanId');
      const directData = searchParams.get('data');
      const url = searchParams.get('url');

      // Debug: Log scanId and session user
      console.log('[ResultsPage] scanId:', scanId, 'url:', url, 'sessionUser:', session?.user);

      if (scanId) {
        try {
          // Use server-side API to fetch scan data
          const response = await fetch(`/api/get-scan-details?scanId=${scanId}`);
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch scan details');
          }
          
          const scanData = await response.json();
          
          // Debug: Log scanData and session userId
          console.log('[ResultsPage] scanData:', scanData, 'sessionUserId:', session?.user?.id);
          
          // Security check: ensure the user owns this scan
          if (scanData.userId && scanData.userId !== session?.user?.id) {
            setError('Unauthorized access to scan.');
            setLoading(false);
            return;
          }
          
          // Merge top-level analyzed_content and analysis_source into the data object
          let mergedData = scanData.analysisResult || scanData;
          if (scanData.analyzed_content) mergedData.analyzed_content = scanData.analyzed_content;
          if (scanData.analysis_source) mergedData.analysis_source = scanData.analysis_source;
          setData(mergedData as ScanData);
        } catch (err: any) {
          // Debug: Log error
          console.error('[ResultsPage] Error fetching scan:', err);
          setError(err.message || 'Failed to fetch scan details.');
        } finally {
          setLoading(false);
        }
      } else if (directData) {
        try {
          const parsedData = JSON.parse(directData);
          // Debug: Log parsed directData
          console.log('[ResultsPage] Parsed directData:', parsedData);
          setData(parsedData);
        } catch (err) {
          // Debug: Log parse error
          console.error('[ResultsPage] Error parsing directData:', err);
          setError('Failed to parse scan data.');
        } finally {
          setLoading(false);
        }
      } else if (url) {
        // Handle URL parameter - trigger analysis
        try {
          console.log('[ResultsPage] Triggering analysis for URL:', url);
          const response = await fetch('/api/analyze-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          
          if (response.ok) {
            const analysisData = await response.json();
            console.log('[ResultsPage] Analysis completed:', analysisData);
            setData(analysisData);
          } else {
            const errorData = await response.json();
            console.error('[ResultsPage] Analysis failed:', errorData);
            setError(errorData.error || 'Failed to analyze content.');
          }
        } catch (err: any) {
          console.error('[ResultsPage] Error during analysis:', err);
          setError(err.message || 'Failed to analyze content.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('No scan data provided.');
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, session?.user?.id]);

  const getRiskBadgeVariant = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW': return 'safe';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'risk';
      default: return 'neutral';
    }
  };

  const getRiskColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW': return 'safe';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'risk';
      default: return 'gray';
    }
  };

  const severityOrder = { HIGH: 2, MEDIUM: 1, LOW: 0 };

  // Utility function to check for English language
  const isEnglish = (lang: string | undefined) => {
    if (!lang) return false;
    const l = lang.toLowerCase();
    return l === 'english' || l === 'en' || l.startsWith('en-');
  };

  const suggestionLimit = React.useMemo(() => {
    // If userProfile is still loading, return a high limit to show all suggestions temporarily
    if (!userProfile && status === 'authenticated') {
      console.log('[ResultsPage] User profile still loading, showing all suggestions temporarily');
      return 100;
    }
    
    const tier = userProfile?.subscriptionTier || 'free';
    const limits = getTierLimits(tier);
    const limit = limits.suggestionsPerScan === 'all' ? 100 : limits.suggestionsPerScan;
    
    // Debug logging
    console.log('[ResultsPage] User profile:', userProfile);
    console.log('[ResultsPage] Subscription tier:', tier);
    console.log('[ResultsPage] Tier limits:', limits);
    console.log('[ResultsPage] Suggestion limit:', limit);
    console.log('[ResultsPage] Total suggestions available:', toArray(data?.suggestions).length);
    
    return limit;
  }, [userProfile, data?.suggestions, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <AlertTriangle className="w-12 h-12 text-risk mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">Analysis Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/">
                <Button variant="outlined" className="inline-flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Button>
              </Link>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">No Data Available</h2>
            <p className="text-gray-600 mb-6">No scan data was found for this analysis.</p>
            <Link href="/">
              <Button className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display font-bold text-gray-800 mb-2">
            Analysis Results
          </h1>
          <p className="text-subtitle text-gray-600">
            Detailed analysis results for your content
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-caption text-gray-600 mb-1">Risk Level</h3>
                <Badge variant={getRiskBadgeVariant(data.riskLevel)} className="text-body font-semibold">
                  {data.riskLevel} Risk
                </Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="text-caption text-gray-600 mb-1">Risk Score</h3>
                <div className="text-title font-bold text-gray-800">{data.riskScore}/100</div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-caption text-gray-600 mb-1">Content Title</h3>
                <p className="text-body font-semibold text-gray-800 truncate">{data.title}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button variant="outlined" className="inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                New Scan
              </Button>
            </Link>
            
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div>
                    <Button 
                      onClick={canExport ? () => setExportModalOpen(true) : undefined}
                      className={`inline-flex items-center gap-2 ${!canExport ? 'opacity-50 cursor-not-allowed bg-gray-300 hover:bg-gray-300 text-gray-600' : ''}`}
                      disabled={!canExport}
                    >
                      {!canExport ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      Export Report
                    </Button>
                  </div>
                </Tooltip.Trigger>
                {!canExport && (
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm max-w-xs z-50"
                      sideOffset={5}
                    >
                      <div className="flex flex-col gap-1">
                        <span>Feature is only available for Pro Members.</span>
                        <span>Please visit <Link href="/pricing" className="text-yellow-300 hover:text-yellow-200 underline">Pricing</Link> page to upgrade your plan.</span>
                      </div>
                      <Tooltip.Arrow className="fill-gray-900" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                )}
              </Tooltip.Root>
            </Tooltip.Provider>
            
            <Link href="/scan-history">
              <Button className="inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                View History
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'details', label: 'Details', icon: FileText },
                { id: 'suggestions', label: 'Suggestions', icon: Target }
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <div key={tab.id} className="relative">
                    <button
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-3 px-1 border-b-2 font-medium text-body transition-colors flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'border-yellow-500 text-yellow-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                      {tab.label}
                      {tab.id === 'suggestions' && toArray(data.suggestions).length > 0 && (
                        <span className="ml-1 flex items-center justify-center rounded-full bg-yellow-500 text-gray-900 text-xs font-bold w-5 h-5">
                          {toArray(data.suggestions).length}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Tab Content - Fixed Height Container */}
          <div className="min-h-[600px]">
            {activeTab === 'overview' && (
              <div className="h-full">
                {/* Header Section */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-title font-bold text-gray-900">Analysis Overview</h3>
                      <p className="text-body text-gray-600">Comprehensive risk assessment summary</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Risk Assessment */}
                  <div className="flex flex-col gap-6">
                    {/* Risk Score Card */}
                    <Card className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
                      <div className="relative">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h4 className="text-body font-semibold text-gray-800 mb-1">Risk Score</h4>
                            <p className="text-caption text-gray-600">Overall content risk assessment</p>
                          </div>
                          <Badge variant={getRiskBadgeVariant(data.riskLevel)} className="text-sm">
                            {data.riskLevel} Risk
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 mb-6">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                              <span className="text-2xl font-bold text-gray-800">{data.riskScore}</span>
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-yellow-200"></div>
                            <div 
                              className="absolute inset-0 rounded-full border-4 border-yellow-500"
                              style={{
                                clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                                transform: `rotate(${(data.riskScore / 100) * 360}deg)`
                              }}
                            ></div>
                          </div>
                          <div className="flex-1">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-caption text-gray-600">Low Risk</span>
                                <span className="text-caption text-gray-600">High Risk</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${data.riskScore}%` }}
                                ></div>
                              </div>
                              <div className="text-caption text-gray-500 text-center">
                                Score: {data.riskScore}/100
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="text-center p-4">
                        <div className="w-12 h-12 bg-risk/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle className="w-6 h-6 text-risk" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800 mb-1">{toArray(data.flaggedSections).length}</div>
                        <div className="text-caption text-gray-600">Flagged Sections</div>
                      </Card>
                      
                      <Card className="text-center p-4">
                        <div className="w-12 h-12 bg-safe/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <Target className="w-6 h-6 text-safe" />
                        </div>
                        <div className="text-2xl font-bold text-gray-800 mb-1">{toArray(data.suggestions).length}</div>
                        <div className="text-caption text-gray-600">Suggestions</div>
                      </Card>
                    </div>

                    {/* Content Info Card */}
                    <Card>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-gray-600" />
                        </div>
                        <h4 className="text-body font-semibold text-gray-800">Content Details</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-caption text-gray-600 mb-1">Title</div>
                            <div className="text-body font-medium text-gray-800 truncate">{data.title}</div>
                          </div>
                        </div>
                        
                        {data.url && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-caption text-gray-600 mb-1">URL</div>
                              <div className="text-caption text-gray-800 truncate">{data.url}</div>
                            </div>
                          </div>
                        )}
                        
                        {data.createdAt && (
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                            <div className="flex-1">
                              <div className="text-caption text-gray-600 mb-1">Analysis Date</div>
                              <div className="text-body font-medium text-gray-800">
                                {new Date(data.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                  
                  {/* Right Column - Analysis Summary */}
                  <div className="flex flex-col gap-6">
                    {/* Analysis Summary Card */}
                    <Card>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-yellow-600" />
                        </div>
                        <h4 className="text-body font-semibold text-gray-800">Analysis Summary</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <div className="text-body font-medium text-gray-800 mb-1">Content Analyzed</div>
                              <div className="text-caption text-gray-600">
                                This content has been thoroughly analyzed for potential Terms of Service violations, 
                                copyright issues, and demonetization risks using advanced AI technology.
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Target className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <div className="text-body font-medium text-gray-800 mb-1">AI-Powered Detection</div>
                              <div className="text-caption text-gray-600">
                                Advanced machine learning models identified potential risks and provided 
                                actionable suggestions to protect your content and revenue.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Action Card */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <h4 className="text-body font-semibold text-gray-800">Next Steps</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-caption text-gray-700">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Review detailed analysis in the Details tab</span>
                        </div>
                        <div className="flex items-center gap-3 text-caption text-gray-700">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Implement suggested improvements</span>
                        </div>
                        <div className="flex items-center gap-3 text-caption text-gray-700">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <span>Monitor content performance</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="h-full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left column: Content Analysis + Highlights + Analyzed Content */}
                  <div className="flex flex-col gap-6">
                    {/* Content Analysis Card */}
                    {data.context_analysis && (
                      <Card>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Globe className="w-4 h-4 text-yellow-600" />
                          </div>
                          <h3 className="text-body font-semibold text-gray-800">Content Analysis</h3>
                        </div>
                        
                        <div className="mb-4 min-h-[400px] lg:min-h-[600px] flex flex-col">
                          {/* Highlighted transcript with risky sections */}
                          <HighlightedTranscript 
                            content={data.analyzed_content || ''} 
                            riskyPhrases={data.risky_phrases || []}
                            riskyPhrasesByCategory={data.risky_phrases_by_category || {}}
                            policyCategories={data.policy_categories || {}}
                            contextAnalysis={data.context_analysis}
                            className="flex-1 min-h-[300px] lg:min-h-[500px] max-h-[700px] overflow-auto"
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <Badge variant="risk" className="text-xs">
                            {data.context_analysis.content_type?.toUpperCase() || 'UNKNOWN'}
                          </Badge>
                          <Badge variant="safe" className="text-xs">
                            {data.context_analysis.target_audience?.toUpperCase() || 'GENERAL'}
                          </Badge>
                          <Badge variant="yellow" className="text-xs">
                            MONETIZATION {data.context_analysis.monetization_impact || 0}%
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-caption text-gray-600">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3" />
                            <span>Language: <span className="font-medium text-gray-800">{data.context_analysis.language_detected}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            <span>Length: <span className="font-medium text-gray-800">{data.context_analysis.content_length} words</span></span>
                          </div>
                        </div>
                        
                        {/* Language Warning */}
                        {data.context_analysis.language_detected && !isEnglish(data.context_analysis.language_detected) && (
                          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm font-medium">Non-English Content Detected</span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">
                              This content appears to be in {data.context_analysis.language_detected}. For best results, please ensure the video has English subtitles enabled or try a different video with English content.
                            </p>
                          </div>
                        )}
                      </Card>
                    )}
                    
                    {/* AI Detection Card */}
                    {data.ai_detection && (
                      <Card>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Brain className="w-4 h-4 text-purple-600" />
                          </div>
                          <h3 className="text-body font-semibold text-gray-800">AI Content Detection</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-caption text-gray-600">AI Generation Probability</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-300 ${
                                    data.ai_detection.probability > 70 ? 'bg-red-500' :
                                    data.ai_detection.probability > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${data.ai_detection.probability}%` }}
                                />
                              </div>
                              <span className="text-body font-semibold text-gray-800">
                                {data.ai_detection.probability}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-caption text-gray-600">
                            <div>Confidence: <span className="font-medium text-gray-800">{data.ai_detection.confidence}%</span></div>
                            <div>Content Type: <span className="font-medium text-gray-800">{data.context_analysis?.content_type || 'Unknown'}</span></div>
                          </div>
                          
                          {data.ai_detection.patterns && data.ai_detection.patterns.length > 0 && (
                            <div>
                              <div className="text-caption text-gray-600 mb-2">Detected Patterns:</div>
                              <div className="flex flex-wrap gap-1">
                                {data.ai_detection.patterns.map((pattern: string, index: number) => (
                                  <Badge key={index} variant="neutral" className="text-xs">
                                    {pattern}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {data.ai_detection.indicators && (
                            <div>
                              <div className="text-caption text-gray-600 mb-2">Analysis Indicators:</div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>Personal Voice: <span className="font-medium">{data.ai_detection.indicators.personal_voice}%</span></div>
                                <div>Natural Flow: <span className="font-medium">{data.ai_detection.indicators.natural_flow}%</span></div>
                                <div>Grammar Consistency: <span className="font-medium">{data.ai_detection.indicators.grammar_consistency}%</span></div>
                                <div>Structured Content: <span className="font-medium">{data.ai_detection.indicators.structured_content}%</span></div>
                              </div>
                            </div>
                          )}
                          
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            <div className="font-medium mb-1">Analysis Summary:</div>
                            <div className="text-caption">{data.ai_detection.explanation}</div>
                          </div>
                          
                          {data.ai_detection.probability > 40 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                              <div className="flex items-center gap-2 text-yellow-800 mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm font-medium">AI Content Detected</span>
                              </div>
                              <p className="text-sm text-yellow-700">
                                This content shows some AI generation patterns. Consider adding more personal anecdotes, 
                                natural speech patterns, or current references to make it more human-like.
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}
                  </div>
                  
                  {/* Right column: Policy Category Analysis + Metadata (desktop) */}
                  <div className="flex flex-col gap-6">
                    {/* Policy Category Analysis Table */}
                    {data.policy_categories && Object.keys(data.policy_categories).length > 0 && (
                      <Card>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Target className="w-4 h-4 text-yellow-600" />
                          </div>
                          <h3 className="text-body font-semibold text-gray-800">Policy Category Analysis</h3>
                        </div>
                        
                        <div className="max-h-96 overflow-y-auto space-y-4">
                          {Object.entries(data.policy_categories)
                            .sort((a, b) => {
                              if (b[1].risk_score !== a[1].risk_score) {
                                return b[1].risk_score - a[1].risk_score;
                              }
                              return (severityOrder[b[1].severity] || 0) - (severityOrder[a[1].severity] || 0);
                            })
                            .map(([cat, val]: any) => (
                              <div key={cat} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-body text-gray-800 truncate max-w-[60%]">
                                    {cat.replace(/_/g, ' ').replace(/\b(\w+) \1\b/g, '$1')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-caption font-medium text-gray-700">{val.risk_score}%</span>
                                    <Badge variant={getRiskBadgeVariant(val.severity)} className="text-xs">
                                      {val.severity} Risk
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="text-caption text-gray-500 mb-2">
                                  Confidence: {val.confidence}%
                                </div>
                                
                                {val.violations && val.violations.length > 0 && (
                                  <div className="text-caption text-risk mb-2">
                                    {val.violations.join(', ')}
                                  </div>
                                )}
                                
                                <div className="text-sm text-gray-800">
                                  {val.explanation}
                                </div>
                              </div>
                            ))}
                        </div>
                      </Card>
                    )}
                    {/* Highlights Card (now in right column) */}
                    {data.highlights && data.highlights.length > 0 && (
                      <Card>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-yellow-600" />
                          </div>
                          <h3 className="text-body font-semibold text-gray-800">Top Risk Highlights</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {data.highlights.map((h, i) => (
                            <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <div className="font-semibold text-yellow-800 mb-2">{h.category}</div>
                              <div className="grid grid-cols-3 gap-2 text-caption text-gray-600">
                                <div>Risk: <span className="font-medium">{h.risk}</span></div>
                                <div>Score: <span className="font-medium">{h.score}</span></div>
                                <div>Confidence: <span className="font-medium">{h.confidence}%</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                  
                  {/* Fallback: If no enhanced details, show flagged sections */}
                  {!data.context_analysis && !data.policy_categories && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-risk/10 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-risk" />
                        </div>
                        <h3 className="text-body font-semibold text-gray-800">Flagged Sections</h3>
                      </div>
                      
                      {toArray(data.flaggedSections).length > 0 ? (
                        <div className="space-y-4">
                          {toArray(data.flaggedSections).map((section, index) => (
                            <div key={index} className="border border-risk/20 bg-risk/5 p-4 rounded-lg">
                              <h4 className="font-semibold text-risk mb-2">Flagged Section {index + 1}</h4>
                              <p className="text-gray-800">{section}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No specific sections were flagged in this analysis.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'suggestions' && (
              <div className="h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-safe/10 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-safe" />
                  </div>
                  <h3 className="text-body font-semibold text-gray-800">Recommendations</h3>
                </div>
                
                {toArray(data.suggestions).length > 0 ? (
                  <div className="space-y-4">
                    {toArray(data.suggestions).map((suggestion, index) => {
                      const isLocked = index >= suggestionLimit;
                      return (
                        <div key={index} className="relative">
                          <div className={isLocked ? 'filter blur-sm opacity-60 pointer-events-none select-none' : ''} aria-hidden={isLocked}>
                            <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                              <h4 className="font-semibold text-yellow-800 mb-2">
                                Suggestion {index + 1}: {suggestion.title}
                              </h4>
                              <p className="text-gray-800 mb-2">{suggestion.text}</p>
                              <div className="flex items-center gap-4 text-caption text-gray-600">
                                <span>Priority: {suggestion.priority}</span>
                                <span>Impact: {suggestion.impact_score}</span>
                              </div>
                            </div>
                          </div>
                          {isLocked && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                              <Lock className="w-6 h-6 text-gray-500 mb-1" />
                              <span className="text-xs text-gray-700 px-2 py-1 rounded">
                                Upgrade to <Link href="/pricing" className="underline text-blue-600">Pro</Link> to unlock more suggestions
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500">No specific suggestions available for this content.</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Export Modal */}
        {data && canExport && (
          <ExportModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            data={data}
          />
        )}
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
}
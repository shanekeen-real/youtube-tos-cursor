"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/imports';
import { Card } from '@/lib/imports';
import { Badge } from '@/lib/imports';
import * as Sentry from "@sentry/nextjs";
import { Clock, AlertTriangle, CheckCircle, XCircle, ExternalLink, Calendar, BarChart3 } from 'lucide-react';

interface Scan {
  id: string;
  url: string;
  title: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
  videoId?: string | null;
  userEmail?: string | null;
}

export default function ScanHistoryPage() {
  const { data: session, status } = useSession();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchScans = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      return Sentry.startSpan(
        {
          op: "ui.action",
          name: "Fetch Scan History",
        },
        async (span) => {
          try {
            span.setAttribute("userId", session.user.id);
            
            console.log('[ScanHistory] Fetching scans for user:', session.user.id);
            const response = await fetch('/api/get-scan-history');
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to fetch scan history');
            }
            
            const data = await response.json();
            console.log('[ScanHistory] Found scans:', data.totalCount);
            
            span.setAttribute("scansCount", data.totalCount);
            setScans(data.scans);
          } catch (err: any) {
            console.error('[ScanHistory] Error fetching scans:', err);
            Sentry.captureException(err, {
              tags: { component: 'scan-history', action: 'fetch-scans' },
              extra: { userId: session.user.id }
            });
            setError(err.message || 'Failed to fetch scan history.');
          } finally {
            setLoading(false);
          }
        }
      );
    };

    fetchScans();
  }, [session?.user?.id]);

  const getRiskBadgeVariant = (level: string) => {
    switch (level.toUpperCase()) {
      case 'LOW': return 'safe';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'risk';
      default: return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'safe';
      case 'processing': return 'yellow';
      case 'failed': return 'risk';
      default: return 'neutral';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scan history...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">Sign In Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to view your scan history and track your content analysis results.</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Sign In to Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <XCircle className="w-12 h-12 text-risk mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">Error Loading Scans</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outlined">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display font-bold text-gray-800 mb-2">
            Scan History
          </h1>
          <p className="text-subtitle text-gray-600">
            View all your previous content scans and their analysis results.
          </p>
        </div>

        {/* Stats Summary */}
        {scans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-caption text-gray-600">Total Scans</p>
                  <p className="text-title font-semibold text-gray-800">{scans.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-safe/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-safe" />
                </div>
                <div>
                  <p className="text-caption text-gray-600">Completed</p>
                  <p className="text-title font-semibold text-gray-800">
                    {scans.filter(s => s.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-risk/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-risk" />
                </div>
                <div>
                  <p className="text-caption text-gray-600">High Risk</p>
                  <p className="text-title font-semibold text-gray-800">
                    {scans.filter(s => s.riskLevel === 'HIGH').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-caption text-gray-600">This Month</p>
                  <p className="text-title font-semibold text-gray-800">
                    {scans.filter(s => {
                      const scanDate = new Date(s.createdAt);
                      const now = new Date();
                      return scanDate.getMonth() === now.getMonth() && 
                             scanDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scan List */}
        {scans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-title font-semibold text-gray-800 mb-2">No Scans Yet</h2>
            <p className="text-gray-600 mb-6">
              Start your first content analysis to see your scan history here.
            </p>
            <Button onClick={() => router.push('/')} className="inline-flex items-center gap-2">
              Start Your First Scan
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <Card key={scan.id} className="hover:border-yellow-300 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon(scan.status)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body font-semibold text-gray-800 mb-1 truncate">
                          {scan.title}
                        </h3>
                        <p className="text-caption text-gray-600 mb-3 truncate">
                          {scan.url}
                        </p>
                        
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="flex items-center gap-2 text-caption text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                          </div>
                          
                          <Badge variant={getRiskBadgeVariant(scan.riskLevel)}>
                            {scan.riskLevel} Risk
                          </Badge>
                          
                          {scan.riskScore && (
                            <div className="flex items-center gap-1 text-caption text-gray-500">
                              <span>Score:</span>
                              <span className="font-semibold">{scan.riskScore}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 ml-4">
                    <Button 
                      variant="outlined" 
                      onClick={() => router.push(`/results?scanId=${scan.id}`)}
                      className="inline-flex items-center gap-2"
                    >
                      View Details
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ScanData } from '@/components/results/types';

export function useResultsData() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const scanId = searchParams?.get('scanId');
      const directData = searchParams?.get('data');
      const url = searchParams?.get('url');

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
          
          // Merge all fields from analysisResult and top-level scan data into a single object
          let mergedData = { ...(scanData.analysisResult || {}), ...scanData };
          
          // Debug logging to verify data structure
          console.log('[useResultsData] Original scanData structure:', {
            hasAnalysisResult: !!scanData.analysisResult,
            analysisResultKeys: scanData.analysisResult ? Object.keys(scanData.analysisResult) : [],
            topLevelKeys: Object.keys(scanData),
            riskyPhrases: scanData.analysisResult?.risky_phrases || scanData.risky_phrases,
            riskyPhrasesByCategory: scanData.analysisResult?.risky_phrases_by_category || scanData.risky_phrases_by_category
          });
          
          console.log('[useResultsData] Merged data structure:', {
            mergedKeys: Object.keys(mergedData),
            riskyPhrases: mergedData.risky_phrases,
            riskyPhrasesByCategory: mergedData.risky_phrases_by_category,
            analyzedContent: mergedData.analyzed_content
          });
          
          setData(mergedData as ScanData);
        } catch (err: unknown) {
          // Debug: Log error
          console.error('[ResultsPage] Error fetching scan:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch scan details.');
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
        } catch (err: unknown) {
          console.error('[ResultsPage] Error during analysis:', err);
          setError(err instanceof Error ? err.message : 'Failed to analyze content.');
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

  return {
    data,
    loading,
    error,
    status
  };
} 
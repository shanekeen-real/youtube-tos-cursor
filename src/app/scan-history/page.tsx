"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import * as Sentry from "@sentry/nextjs";

interface Scan {
  id: string;
  url: string;
  title: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
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
            
            const db = getFirestore(app);
            const scansRef = collection(db, 'analysis_cache');
            const q = query(
              scansRef,
              where('userId', '==', session.user.id),
              orderBy('timestamp', 'desc')
            );
            
            console.log('[ScanHistory] Fetching scans for user:', session.user.id);
            const querySnapshot = await getDocs(q);
            console.log('[ScanHistory] Found scans:', querySnapshot.docs.length);
            
            const scansData = querySnapshot.docs.map(doc => {
              const data = doc.data();
              // Handle both timestamp and createdAt fields for backward compatibility
              const timestamp = data.timestamp?.toDate?.() || data.timestamp || data.createdAt || new Date();
              return {
                id: doc.id,
                url: data.original_url || data.url || '',
                title: data.analysisResult?.title || data.title || 'Untitled',
                riskLevel: data.analysisResult?.riskLevel || data.analysisResult?.risk_level || data.riskLevel || 'Unknown',
                createdAt: timestamp.toISOString ? timestamp.toISOString() : timestamp,
                status: 'completed' // All cached analyses are completed
              };
            }) as Scan[];
            
            span.setAttribute("scansCount", scansData.length);
            setScans(scansData);
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

  const getRiskBadgeColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'LOW': return 'green';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'red';
      default: return 'gray';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="text-center py-10">
        <p>Loading scan history...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">Please sign in to view your scan history.</p>
        <Button onClick={() => router.push('/')}>Sign In</Button>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#212121] mb-2">Scan History</h1>
        <p className="text-gray-600">View all your previous content scans and their results.</p>
      </div>

      {scans.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No scans found.</p>
            <Button onClick={() => router.push('/')}>Start Your First Scan</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => (
            <Card key={scan.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-[#212121] mb-1">{scan.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{scan.url}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{new Date(scan.createdAt).toLocaleDateString()}</span>
                    <Badge color={getRiskBadgeColor(scan.riskLevel)}>
                      {scan.riskLevel} Risk
                    </Badge>
                    <Badge color={scan.status === 'completed' ? 'green' : scan.status === 'processing' ? 'yellow' : 'red'}>
                      {scan.status}
                    </Badge>
                  </div>
                </div>
                <Button 
                  variant="outlined" 
                  onClick={() => router.push(`/results?scanId=${scan.id}`)}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 
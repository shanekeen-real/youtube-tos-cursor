"use client";
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '@/components/ClientLayout';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

// Define the structure of a scan object
interface Scan {
  id: string;
  createdAt: string;
  risk_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  flagged_section: string;
  originalText: string;
}

export default function ScanHistoryPage() {
  const authContext = useContext(AuthContext);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchScans = async () => {
      if (!authContext?.user) {
        setLoading(false);
        return;
      }

      try {
        const db = getFirestore(app);
        const scansRef = collection(db, 'scans');
        const q = query(
          scansRef,
          where('userId', '==', authContext.user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const scansData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Scan[];
        
        setScans(scansData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch scan history.');
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [authContext?.user]);

  const getRiskBadgeColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (level) {
      case 'LOW': return 'green';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10">
        <p>Loading scan history...</p>
      </div>
    );
  }

  if (!authContext?.user) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">Please sign in to view your scan history.</p>
        <Button onClick={() => authContext?.setAuthOpen(true)}>Sign In</Button>
      </div>
    );
  }
  
  if (error) {
    return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  }

  return (
    <main className="min-h-screen w-full max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[#212121] mb-6">Scan History</h1>
      
      {scans.length === 0 ? (
        <Card>
            <div className="text-center text-gray-500">
                <p>You have no saved scans.</p>
                <Button variant="secondary" onClick={() => router.push('/')}>Make your first scan</Button>
            </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {scans.map((scan) => (
            <Card key={scan.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex-grow min-w-0">
                <div className="text-sm text-gray-500 mb-1">
                  {new Date(scan.createdAt).toLocaleString()}
                </div>
                <p className="font-semibold text-lg text-gray-800 truncate" title={scan.flagged_section}>
                  {scan.flagged_section}
                </p>
                <p className="text-sm text-gray-600 truncate" title={scan.originalText}>
                  {scan.originalText}
                </p>
              </div>
              <div className="flex items-center space-x-4 ml-4">
                <Badge color={getRiskBadgeColor(scan.risk_level)}>{scan.risk_level}</Badge>
                <div className="text-2xl font-bold text-gray-700">{scan.risk_score}</div>
                <Button 
                  variant="secondary"
                  onClick={() => router.push(`/results?scanId=${scan.id}`)}
                >
                  View Report
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
} 
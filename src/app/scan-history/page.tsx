"use client";
import React from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function ScanHistoryPage() {
  // Placeholder for scan data
  const scans: any[] = [];
  return (
    <main className="min-h-screen bg-white flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-2xl bg-white">
        {scans.length === 0 ? (
          <Card className="text-center text-[#606060]">No scans found. Your scan history will appear here.</Card>
        ) : (
          <div className="flex flex-col gap-4">
            {scans.map((scan, i) => (
              <Card key={i} className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-[#212121]">Scan #{i + 1}</div>
                  <div className="text-xs text-[#606060]">{scan.date}</div>
                </div>
                <Button variant="blue">View</Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
} 
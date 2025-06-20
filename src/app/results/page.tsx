"use client";
import React from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '../../components/Card';
import ProgressMeter from '../../components/ProgressMeter';
import Badge from '../../components/Badge';
import Accordion from '../../components/Accordion';
import Button from '../../components/Button';

export default function ResultsPage() {
  const params = useSearchParams();
  let data: any = null;
  try {
    data = params.get('data') ? JSON.parse(params.get('data') as string) : null;
  } catch {}

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
            <div className="text-5xl font-bold text-red-600 mb-2">{data?.risk_score ?? '--'}%</div>
            {data?.risk_score && <Badge color="red" className="mb-2">HIGH RISK</Badge>}
            <div className="text-sm text-[#606060] mb-2">{data?.flagged_section}</div>
            {data?.risk_score && <ProgressMeter value={data.risk_score} color="red" label="Overall Risk Score" />}
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
              value={data?.input || data?.highlights?.map((h: any) => h.text).join('\n') || ''}
              readOnly
            />
            <div className="flex gap-2 mt-2">
              <Badge color="red">High Risk</Badge>
              <Badge color="yellow">Medium Risk</Badge>
              <Badge color="green">Low Risk</Badge>
            </div>
          </Card>
          {data?.suggestions && (
            <Card className="border border-gray-200">
              <div className="font-semibold mb-2">Actionable Suggestions</div>
              {data.suggestions.map((s: any, i: number) => (
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
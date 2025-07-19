import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/lib/imports';

interface RiskScoreCardProps {
  riskScore: number;
}

export default function RiskScoreCard({ riskScore }: RiskScoreCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-gray-600" />
        </div>
        <div>
          <h3 className="text-caption text-gray-600 mb-1">Risk Score</h3>
          <div className="text-title font-bold text-gray-800">{riskScore}/100</div>
        </div>
      </div>
    </Card>
  );
} 
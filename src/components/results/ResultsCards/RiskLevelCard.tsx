import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, Badge } from '@/lib/imports';
import { getRiskBadgeVariant } from '../ResultsUtils';

interface RiskLevelCardProps {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function RiskLevelCard({ riskLevel }: RiskLevelCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-caption text-gray-600 mb-1">Risk Level</h3>
          <Badge variant={getRiskBadgeVariant(riskLevel)} className="text-body font-semibold">
            {riskLevel} Risk
          </Badge>
        </div>
      </div>
    </Card>
  );
} 
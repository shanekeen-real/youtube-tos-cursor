import React from 'react';
import RiskLevelCard from './ResultsCards/RiskLevelCard';
import RiskScoreCard from './ResultsCards/RiskScoreCard';
import ContentTitleCard from './ResultsCards/ContentTitleCard';
import { ScanData } from './types';

interface ResultsSummaryProps {
  data: ScanData;
}

export default function ResultsSummary({ data }: ResultsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <RiskLevelCard riskLevel={data.riskLevel} />
      <RiskScoreCard riskScore={data.riskScore} />
      <ContentTitleCard title={data.title} />
    </div>
  );
} 
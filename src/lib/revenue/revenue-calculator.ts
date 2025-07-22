import { VideoStats, ScanData } from '../../app/api/revenue-at-risk/route';

interface RevenueCalculationParams {
  videoIds: string[];
  viewCounts: Map<string, VideoStats>;
  scanMap: Map<string, { riskLevel: string; timestamp: Date }>;
  userCpm?: number;
  userRpm?: number;
  monetizedPercent: number;
  includeCut: boolean;
}

export interface RevenueCalculationResult {
  atRisk: number;
  secured: number;
  total: number;
  details: Array<{
    videoId: string;
    title: string;
    earnings: number;
    riskLevel: string;
    cpm?: number;
    rpm?: number;
    monetizedPercent: number;
    includeCut: boolean;
    viewCount: number;
    timestamp: Date | null;
  }>;
}

export function calculateRevenueAtRisk(params: RevenueCalculationParams): RevenueCalculationResult {
  const {
    videoIds,
    viewCounts,
    scanMap,
    userCpm,
    userRpm,
    monetizedPercent,
    includeCut,
  } = params;

  let atRisk = 0;
  let secured = 0;
  let total = 0;
  const details = [];
  for (const videoId of videoIds) {
    const stats = viewCounts.get(videoId) || { viewCount: 0, title: 'Untitled' };
    let revenue = 0;
    if (typeof userRpm === 'number' && !isNaN(userRpm)) {
      // Use RPM: revenue = (views * RPM) / 1000
      revenue = (stats.viewCount * userRpm) / 1000;
    } else if (typeof userCpm === 'number' && !isNaN(userCpm)) {
      // Use CPM: revenue = (views * monetizedPercent/100 * (includeCut ? 0.55 : 1) * CPM) / 1000
      revenue = (stats.viewCount * (monetizedPercent / 100) * (includeCut ? 0.55 : 1) * userCpm) / 1000;
    }
    total += revenue;
    const scan = scanMap.get(videoId);
    let riskLevel = 'Unknown';
    if (scan) {
      riskLevel = scan.riskLevel;
    }
    if (riskLevel === 'LOW') {
      secured += revenue;
    } else {
      atRisk += revenue;
    }
    details.push({
      videoId,
      title: stats.title,
      earnings: revenue,
      riskLevel,
      cpm: userCpm,
      rpm: userRpm,
      monetizedPercent,
      includeCut,
      viewCount: stats.viewCount,
      timestamp: scan?.timestamp || null,
    });
  }

  return {
    atRisk: parseFloat(atRisk.toFixed(2)),
    secured: parseFloat(secured.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    details,
  };
} 
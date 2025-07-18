import { ScanData } from './types';

export function toArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val === undefined || val === null) return [];
  if (typeof val === 'string') return [val];
  return Array.from(val);
}

export function getRiskBadgeVariant(level: 'LOW' | 'MEDIUM' | 'HIGH') {
  switch (level) {
    case 'LOW': return 'safe';
    case 'MEDIUM': return 'yellow';
    case 'HIGH': return 'risk';
    default: return 'neutral';
  }
}

export function getRiskColor(level: 'LOW' | 'MEDIUM' | 'HIGH') {
  switch (level) {
    case 'LOW': return 'safe';
    case 'MEDIUM': return 'yellow';
    case 'HIGH': return 'risk';
    default: return 'gray';
  }
}

export const severityOrder = { HIGH: 2, MEDIUM: 1, LOW: 0 };

export function generateAnalysisSummary(data: ScanData | null) {
  if (!data) {
    return {
      title: 'Analysis complete',
      summary: 'Your content has been analyzed. Review the details and suggestions to optimize your content for monetization.',
      icon: 'Info' as const,
      variant: 'neutral' as const,
      bgColor: 'bg-gray-100',
      iconColor: 'text-gray-600'
    };
  }
  
  switch (data.riskLevel) {
    case 'LOW':
      return {
        title: 'Your content appears safe for monetization',
        summary: `Great news! Your content shows minimal risk with a score of ${data.riskScore}/100. Your video should be fine for monetization. Continue creating content while maintaining these standards.`,
        icon: 'CheckCircle' as const,
        variant: 'safe' as const,
        bgColor: 'bg-safe/10',
        iconColor: 'text-safe'
      };
    case 'MEDIUM':
      return {
        title: 'Moderate risk detected - review recommended',
        summary: `Your content has a moderate risk score of ${data.riskScore}/100. This level of risk does put your revenue and monetization at risk. We recommend reviewing the suggestions provided to improve your content's safety and protect your earnings.`,
        icon: 'AlertTriangle' as const,
        variant: 'yellow' as const,
        bgColor: 'bg-yellow-100',
        iconColor: 'text-yellow-600'
      };
    case 'HIGH':
      return {
        title: 'High risk detected - immediate action required',
        summary: `Your content has a high risk score of ${data.riskScore}/100. This poses a significant threat to your monetization. Please urgently review the suggested changes to protect your revenue and avoid potential demonetization.`,
        icon: 'AlertTriangle' as const,
        variant: 'risk' as const,
        bgColor: 'bg-risk/10',
        iconColor: 'text-risk'
      };
    default:
      return {
        title: 'Analysis complete',
        summary: `Your content has been analyzed with a risk score of ${data.riskScore}/100. Review the details and suggestions to optimize your content for monetization.`,
        icon: 'Info' as const,
        variant: 'neutral' as const,
        bgColor: 'bg-gray-100',
        iconColor: 'text-gray-600'
      };
  }
}

export function isEnglish(lang: string | undefined) {
  if (!lang) return false;
  const l = lang.toLowerCase();
  return l === 'english' || l === 'en' || l.startsWith('en-');
} 
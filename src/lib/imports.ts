/**
 * Centralized import index for common components and utilities
 * This file provides standardized imports to reduce inconsistencies across the codebase
 */

// UI Components
export { default as Button } from '@/components/Button';
export { default as Card } from '@/components/Card';
export { default as Badge } from '@/components/Badge';
export { default as ProgressMeter } from '@/components/ProgressMeter';
export { default as FeatureGrid, type FeatureSet } from '@/components/FeatureGrid';
export { default as PricingCard } from '@/components/PricingCard';
export { default as Accordion } from '@/components/Accordion';

// Modal Components
export { default as AuthModal } from '@/components/AuthModal';
export { default as ExportModal } from '@/components/ExportModal';
export { default as CPMSetupModal } from '@/components/CPMSetupModal';
export { default as VideoReportsModal } from '@/components/VideoReportsModal';
export { default as YouTubeWelcomeModal } from '@/components/YouTubeWelcomeModal';
export { default as TwoFactorSetupModal } from '@/components/TwoFactorSetupModal';
export { default as TwoFactorDisableModal } from '@/components/TwoFactorDisableModal';
export { default as TwoFactorWrapper } from '@/components/TwoFactorWrapper';
export { default as ClientLayout, AuthContext } from '@/components/ClientLayout';
export { default as ConnectYouTubeButton } from '@/components/ConnectYouTubeButton';
export { default as UserMenu } from '@/components/UserMenu';
export { default as FirebaseAuthProvider } from '@/components/FirebaseAuthProvider';
export { default as SessionProvider } from '@/components/SessionProvider';
export { default as ErrorBoundary } from '@/components/ErrorBoundary';
export { default as SentryTestWidget } from '@/components/SentryTestWidget';

// Dashboard Components
export { default as DashboardHeader } from '@/components/dashboard/DashboardHeader';
export { default as RevenueAnalysis } from '@/components/dashboard/RevenueAnalysis';
export { default as VideoList } from '@/components/dashboard/VideoList';
export { default as YouTubeIntegration } from '@/components/dashboard/YouTubeIntegration';

// Results Components
export { default as ResultsSummary } from '@/components/results/ResultsSummary';
export { default as ResultsHeader } from '@/components/results/ResultsHeader';
export { default as TabNavigation } from '@/components/results/ResultsTabs/TabNavigation';
export { default as OverviewTab } from '@/components/results/ResultsTabs/OverviewTab';
export { default as DetailsTab } from '@/components/results/ResultsTabs/DetailsTab';
export { default as SuggestionsTab } from '@/components/results/ResultsTabs/SuggestionsTab';
export { default as AIDetectionTab } from '@/components/results/ResultsTabs/AIDetectionTab';

// Settings Components
export { default as AccountDetailsCard } from '@/components/settings/AccountDetailsCard';
export { default as PreferencesCard } from '@/components/settings/PreferencesCard';
export { default as PrivacyCard } from '@/components/settings/PrivacyCard';
export { default as QuickActionsCard } from '@/components/settings/QuickActionsCard';
export { default as SubscriptionCard } from '@/components/settings/SubscriptionCard';
export { default as UsageCard } from '@/components/settings/UsageCard';
export { default as YouTubeCard } from '@/components/settings/YouTubeCard';

// Transcript Components
export { default as TranscriptViewer } from '@/components/transcript/TranscriptViewer';
export { default as TranscriptHighlighter } from '@/components/transcript/TranscriptHighlighter';
export { default as HighlightedTranscript } from '@/components/HighlightedTranscript';

// UI Components (shadcn/ui)
export { Badge as UIBadge } from '@/components/ui/badge';
export { Button as UIButton } from '@/components/ui/button';
export { Card as UICard } from '@/components/ui/card';
export { Input as UIInput } from '@/components/ui/input';
export { Textarea as UITextarea } from '@/components/ui/textarea';
export { Toast as UIToast } from '@/components/ui/toast';
export { Toaster as UIToaster } from '@/components/ui/toaster';

// Loading and Error Components
export { default as LoadingSpinner } from '@/components/ui/loading-spinner';
export { default as ErrorState } from '@/components/ui/error-state';

// Hooks
export { useDashboardData } from '@/hooks/dashboard/useDashboardData';
export { useYouTubeIntegration } from '@/hooks/dashboard/useYouTubeIntegration';
export { useVideoManagement } from '@/hooks/dashboard/useVideoManagement';
export { useRevenueAnalysis } from '@/hooks/dashboard/useRevenueAnalysis';
export { useDashboardModals } from '@/hooks/dashboard/useDashboardModals';

export { useResultsData } from '@/hooks/results/useResultsData';
export { useResultsPermissions } from '@/hooks/results/useResultsPermissions';
export { useResultsNavigation } from '@/hooks/results/useResultsNavigation';
export { useResultsExport } from '@/hooks/results/useResultsExport';

export { useSettingsData } from '@/hooks/settings/useSettingsData';
export { useSettingsActions } from '@/hooks/settings/useSettingsActions';
export { useSettingsModals } from '@/hooks/settings/useSettingsModals';
export { useSettingsYouTube } from '@/hooks/settings/useSettingsYouTube';

export { useToast } from '@/hooks/use-toast';

// Utilities
// AI analysis functions are server-side only and should be called via API routes
// Multi-modal analysis functions are server-side only and should be called via API routes
// Video processing functions are server-side only and should be called via API routes
export { getChannelContext } from '@/lib/channel-context';
export { checkUserCanScan } from '@/lib/subscription-utils';
export { generateCSV, generatePDF, downloadFile, generateFilename } from '@/lib/export-utils';

// Constants
export { FALSE_POSITIVE_WORDS, filterFalsePositives } from '@/lib/constants/false-positives';
export { 
  YOUTUBE_URL_PATTERNS, 
  ENGLISH_LANGUAGE_VARIANTS, 
  extractVideoId, 
  isValidYouTubeUrl, 
  detectLanguage, 
  isNonEnglish 
} from '@/lib/constants/url-patterns';
export { 
  EXPORT_FORMATS, 
  MIME_TYPES, 
  FILE_EXTENSIONS, 
  getMimeType, 
  getFileExtension 
} from '@/lib/constants/export-config';
export { 
  TEXT_PROCESSING, 
  PERFORMANCE_LIMITS, 
  RISK_THRESHOLDS, 
  getRiskLevel, 
  getChunkConfig 
} from '@/lib/constants/analysis-config';
export { 
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TIER_ORDER,
  SUBSCRIPTION_TIER_NAMES,
  SUBSCRIPTION_TIER_COLORS,
  getTierIndex,
  getNextTier,
  getPreviousTier,
  isUpgradeable,
  isDowngradeable,
  type SubscriptionTier
} from '@/lib/constants/subscription-config';

// Types
export type { AnalysisData, ExportOptions } from '@/lib/export-utils';
export type { UserProfile } from '@/components/dashboard/types';
export type { Video } from '@/components/dashboard/types'; 
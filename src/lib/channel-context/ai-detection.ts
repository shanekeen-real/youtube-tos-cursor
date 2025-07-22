import { LegalChannelData, AIDetectionIndicators } from './types';
import { AI_DETECTION_THRESHOLDS } from './config';
import { 
  calculateChannelAge, 
  calculateConsistencyScore, 
  calculateVariationScore, 
  calculateConfidence 
} from './utils';

/**
 * Calculate AI detection indicators for a channel
 */
export function calculateAIIndicators(channelData: LegalChannelData): AIDetectionIndicators {
  const channelAge = calculateChannelAge(channelData.accountDate);
  const videosPerDay = channelData.videoCount / Math.max(channelAge, 1);
  const subToVideoRatio = channelData.subscriberCount / Math.max(channelData.videoCount, 1);
  const viewToSubRatio = channelData.viewCount / Math.max(channelData.subscriberCount, 1);

  // Upload consistency (perfect timing = AI indicator, but be more lenient)
  const uploadConsistency = channelData.uploadSchedule?.averageDaysBetween 
    ? calculateConsistencyScore(channelData.uploadSchedule.averageDaysBetween)
    : 0.5;

  // Title variation (repetitive = AI indicator, but allow for branding)
  const titleVariation = channelData.titlePatterns 
    ? calculateVariationScore(channelData.titlePatterns)
    : 0.5;

  // Description templates (template usage = AI indicator)
  const descriptionTemplates = channelData.descriptionTemplates?.length || 0;

  // Calculate overall AI probability with conservative thresholds
  let aiScore = 0;
  
  // Conservative scoring - only flag obvious AI patterns
  if (uploadConsistency > AI_DETECTION_THRESHOLDS.uploadConsistency) {
    aiScore += 15; // Only perfect consistency
  }
  if (titleVariation < AI_DETECTION_THRESHOLDS.titleVariation) {
    aiScore += 10; // Only very low variation
  }
  if (subToVideoRatio > AI_DETECTION_THRESHOLDS.subToVideoRatio) {
    aiScore += 5; // Only extremely high ratios
  }
  if (viewToSubRatio < AI_DETECTION_THRESHOLDS.viewToSubRatio) {
    aiScore += 10; // Only very low engagement
  }
  if (videosPerDay > AI_DETECTION_THRESHOLDS.videosPerDay) {
    aiScore += 15; // Only extremely high frequency
  }
  if (descriptionTemplates > AI_DETECTION_THRESHOLDS.descriptionTemplates) {
    aiScore += 5; // Only excessive templates
  }

  // Bonus deductions for established channels
  if (channelAge > AI_DETECTION_THRESHOLDS.establishedChannelAge * 365) {
    aiScore = Math.max(0, aiScore - AI_DETECTION_THRESHOLDS.establishedChannelDeduction);
  }
  if (channelData.subscriberCount > AI_DETECTION_THRESHOLDS.largeChannelSubscribers) {
    aiScore = Math.max(0, aiScore - AI_DETECTION_THRESHOLDS.largeChannelDeduction);
  }
  if (channelData.videoCount > AI_DETECTION_THRESHOLDS.highVideoCount) {
    aiScore = Math.max(0, aiScore - AI_DETECTION_THRESHOLDS.highVideoCountDeduction);
  }

  const aiProbability = Math.min(aiScore, 100);
  const confidence = calculateConfidence(channelData);

  return {
    uploadConsistency,
    titleVariation,
    descriptionTemplates,
    subToVideoRatio,
    viewToSubRatio,
    videosPerDay,
    aiProbability,
    confidence,
  };
} 
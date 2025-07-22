import { YouTubeVideoItem, LegalChannelData } from './types';
import { PATTERN_THRESHOLDS, CONFIDENCE_WEIGHTS } from './config';

/**
 * Analyze title patterns in videos
 */
export function analyzeTitlePatterns(videos: YouTubeVideoItem[]): string[] {
  const titles = videos.map(v => v.snippet.title);
  const patterns: string[] = [];
  
  // Look for common patterns
  const commonPatterns = [
    /^[A-Z\s]+$/, // ALL CAPS
    /^\d+\.\s/, // Numbered lists
    /^How to/i, // How-to videos
    /^The Truth About/i, // Truth videos
    /^You Won't Believe/i, // Clickbait
  ];
  
  commonPatterns.forEach(pattern => {
    const matches = titles.filter(title => pattern.test(title));
    if (matches.length > titles.length * PATTERN_THRESHOLDS.titlePatternMatch) {
      patterns.push(pattern.source);
    }
  });
  
  return patterns;
}

/**
 * Analyze description templates in videos
 */
export function analyzeDescriptionTemplates(videos: YouTubeVideoItem[]): string[] {
  const descriptions = videos.map(v => v.snippet.description);
  const templates: string[] = [];
  
  // Look for template patterns
  const templatePatterns = [
    /Subscribe to our channel/i,
    /Follow us on social media/i,
    /Like and share this video/i,
    /Comment below/i,
  ];
  
  templatePatterns.forEach(pattern => {
    const matches = descriptions.filter(desc => pattern.test(desc));
    if (matches.length > descriptions.length * PATTERN_THRESHOLDS.descriptionTemplateMatch) {
      templates.push(pattern.source);
    }
  });
  
  return templates;
}

/**
 * Analyze upload schedule patterns
 */
export function analyzeUploadSchedule(videos: YouTubeVideoItem[]): { 
  averageDaysBetween: number; 
  preferredDays: string[]; 
  preferredTimes: string[] 
} {
  if (videos.length < 2) {
    return { averageDaysBetween: 0, preferredDays: [], preferredTimes: [] };
  }
  
  const dates = videos.map(v => new Date(v.snippet.publishedAt)).sort((a, b) => b.getTime() - a.getTime());
  const intervals: number[] = [];
  
  for (let i = 0; i < dates.length - 1; i++) {
    const interval = (dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24);
    intervals.push(interval);
  }
  
  const averageDaysBetween = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  
  // Analyze preferred days and times
  const days = dates.map(d => d.toLocaleDateString('en-US', { weekday: 'long' }));
  const times = dates.map(d => d.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }));
  
  const dayCounts = days.reduce((acc, day) => {
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const timeCounts = times.reduce((acc, time) => {
    acc[time] = (acc[time] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const preferredDays = Object.entries(dayCounts)
    .filter(([_, count]) => count > dates.length * PATTERN_THRESHOLDS.uploadSchedulePreference)
    .map(([day]) => day);
  
  const preferredTimes = Object.entries(timeCounts)
    .filter(([_, count]) => count > dates.length * PATTERN_THRESHOLDS.uploadSchedulePreference)
    .map(([time]) => time);
  
  return { averageDaysBetween, preferredDays, preferredTimes };
}

/**
 * Calculate average video length (placeholder)
 */
export function calculateAverageVideoLength(videos: YouTubeVideoItem[]): number {
  // This would require additional API calls to get video duration
  // For now, return a placeholder
  return 0;
}

/**
 * Calculate upload frequency
 */
export function calculateUploadFrequency(videos: YouTubeVideoItem[]): number {
  if (videos.length < 2) return 0;
  
  const firstDate = new Date(videos[videos.length - 1].snippet.publishedAt);
  const lastDate = new Date(videos[0].snippet.publishedAt);
  const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return videos.length / Math.max(daysDiff, 1);
}

/**
 * Calculate channel age in days
 */
export function calculateChannelAge(publishedAt: string): number {
  const published = new Date(publishedAt);
  const now = new Date();
  return (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Calculate consistency score for upload patterns
 */
export function calculateConsistencyScore(averageDaysBetween: number): number {
  // Perfect consistency (same interval) = 1.0
  // High variation = 0.0
  // This is a simplified calculation
  return Math.min(averageDaysBetween / 7, 1.0);
}

/**
 * Calculate variation score for title patterns
 */
export function calculateVariationScore(patterns: string[]): number {
  // More patterns = more variation = higher score
  return Math.min(patterns.length / 5, 1.0);
}

/**
 * Calculate confidence score for AI detection
 */
export function calculateConfidence(channelData: LegalChannelData): number {
  // Higher confidence with more data points
  let confidence = CONFIDENCE_WEIGHTS.baseConfidence;
  
  if (channelData.videoCount > CONFIDENCE_WEIGHTS.videoCountThreshold) {
    confidence += CONFIDENCE_WEIGHTS.videoCountBonus;
  }
  if (channelData.subscriberCount > CONFIDENCE_WEIGHTS.subscriberThreshold) {
    confidence += CONFIDENCE_WEIGHTS.subscriberBonus;
  }
  if (channelData.titlePatterns && channelData.titlePatterns.length > 0) {
    confidence += CONFIDENCE_WEIGHTS.patternBonus;
  }
  
  return Math.min(confidence, 100);
}

/**
 * Check if cache entry is expired
 */
export function isExpired(timestamp: string, ttl: number): boolean {
  const age = Date.now() - new Date(timestamp).getTime();
  return age > ttl;
} 
import { RiskLevel } from '../../types/ai-analysis';

/**
 * Centralized constants for analysis configuration
 * These constants define performance limits, thresholds, and processing parameters
 */

/**
 * Text processing configuration
 */
export const TEXT_PROCESSING = {
  CHUNK_SIZE: 3500,
  CHUNK_OVERLAP: 250,
  MAX_TEXT_LENGTH: 100000, // 100KB limit
  MIN_TEXT_LENGTH: 10
} as const;

/**
 * Performance limits for analysis
 */
export const PERFORMANCE_LIMITS = {
  MAX_REGEX_PHRASES: 50,
  MAX_SUGGESTIONS: 12,
  MAX_RISKY_PHRASES: 100,
  CACHE_SIZE_LIMIT: 100,
  API_CALL_THROTTLE: 1000, // 1 second
  MAX_SESSION_RETRIES: 20,
  SESSION_RETRY_DELAY: 200
} as const;

/**
 * Risk assessment thresholds
 */
export const RISK_THRESHOLDS = {
  HIGH_RISK: 70,
  MEDIUM_RISK: 40,
  LOW_RISK: 20,
  DEFAULT_CONFIDENCE: 75,
  EMERGENCY_RISK_SCORE: 50
} as const;

/**
 * AI detection sensitivity multipliers by content type
 */
export const AI_DETECTION_SENSITIVITY = {
  GAMING: 1.2,
  EDUCATIONAL: 0.8,
  ENTERTAINMENT: 1.0,
  NEWS: 0.9,
  TUTORIAL: 0.7,
  REVIEW: 0.8,
  VLOG: 1.1,
  MUSIC: 0.6,
  SPORTS: 0.9,
  DEFAULT: 0.8
} as const;

/**
 * Content type categories for analysis
 */
export const CONTENT_TYPES = {
  GAMING: 'Gaming',
  EDUCATIONAL: 'Educational',
  ENTERTAINMENT: 'Entertainment',
  NEWS: 'News',
  TUTORIAL: 'Tutorial',
  REVIEW: 'Review',
  VLOG: 'Vlog',
  MUSIC: 'Music',
  SPORTS: 'Sports',
  GENERAL: 'General'
} as const;

/**
 * Target audience categories
 */
export const TARGET_AUDIENCES = {
  GENERAL: 'General Audience',
  FAMILY: 'Family',
  TEEN: 'Teen',
  ADULT: 'Adult',
  PROFESSIONAL: 'Professional',
  EDUCATIONAL: 'Educational'
} as const;

/**
 * Analysis modes
 */
export const ANALYSIS_MODES = {
  ENHANCED: 'enhanced',
  BASIC: 'basic',
  FALLBACK: 'fallback',
  EMERGENCY: 'emergency',
  MULTI_MODAL: 'multi-modal'
} as const;

/**
 * Queue status values
 */
export const QUEUE_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

/**
 * Error handling configuration
 */
export const ERROR_HANDLING = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000,
  GRACEFUL_DEGRADATION: true
} as const;

/**
 * Caching configuration
 */
export const CACHE_CONFIG = {
  ENABLED: true,
  DURATION_DAYS: 7,
  MAX_ENTRIES: 1000,
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24 hours
} as const;

/**
 * Utility function to get AI detection sensitivity for content type
 * @param contentType - The content type
 * @returns The sensitivity multiplier
 */
export function getAIDetectionSensitivity(contentType: string): number {
  return AI_DETECTION_SENSITIVITY[contentType as keyof typeof AI_DETECTION_SENSITIVITY] || AI_DETECTION_SENSITIVITY.DEFAULT;
}

/**
 * Utility function to determine risk level from score
 * @param score - The risk score (0-100)
 * @returns The risk level
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.HIGH_RISK) return 'HIGH';
  if (score >= RISK_THRESHOLDS.MEDIUM_RISK) return 'MEDIUM';
  return 'LOW';
}

/**
 * Utility function to check if text length is within limits
 * @param text - The text to check
 * @returns True if text length is acceptable
 */
export function isTextLengthValid(text: string): boolean {
  const length = text.length;
  return length >= TEXT_PROCESSING.MIN_TEXT_LENGTH && length <= TEXT_PROCESSING.MAX_TEXT_LENGTH;
}

/**
 * Utility function to get chunk configuration for text processing
 * @param textLength - The length of text to process
 * @returns Chunk configuration
 */
export function getChunkConfig(textLength: number) {
  return {
    chunkSize: TEXT_PROCESSING.CHUNK_SIZE,
    overlap: TEXT_PROCESSING.CHUNK_OVERLAP,
    needsChunking: textLength > TEXT_PROCESSING.CHUNK_SIZE
  };
} 
/**
 * Centralized constants for URL patterns and language detection
 * These patterns are used for URL parsing and language detection across the application
 */

/**
 * YouTube URL patterns for extracting video IDs
 * Supports various YouTube URL formats
 */
export const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  /youtube\.com\/v\/([^&\n?#]+)/,
  /youtube\.com\/watch\?.*&v=([^&\n?#]+)/
];

/**
 * Language detection patterns using Unicode ranges
 * These patterns identify non-English content for better analysis
 */
export const LANGUAGE_DETECTION_PATTERNS = {
  ARABIC: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/,
  CHINESE: /[\u4E00-\u9FFF]/,
  JAPANESE: /[\u3040-\u309F\u30A0-\u30FF]/,
  KOREAN: /[\uAC00-\uD7AF]/,
  THAI: /[\u0E00-\u0E7F]/,
  HINDI: /[\u0900-\u097F]/,
  // Combined pattern for any non-English language
  NON_ENGLISH: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F\u0900-\u097F]/
};

/**
 * English language variants for transcript fetching
 * These are tried in order when fetching YouTube transcripts
 */
export const ENGLISH_LANGUAGE_VARIANTS = ['en', 'en-US', 'en-GB', 'en-CA', 'en-AU'];

/**
 * Language names mapped to their detection patterns
 */
export const LANGUAGE_NAMES = {
  ARABIC: 'Arabic',
  CHINESE: 'Chinese',
  JAPANESE: 'Japanese',
  KOREAN: 'Korean',
  THAI: 'Thai',
  HINDI: 'Hindi',
  ENGLISH: 'English'
};

/**
 * HTML parsing patterns for transcript extraction
 * These patterns are used to extract transcript content from HTML
 */
export const TRANSCRIPT_HTML_PATTERNS = [
  /<div[^>]*class="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<textarea[^>]*>([\s\S]*?)<\/textarea>/i,
  /<pre[^>]*>([\s\S]*?)<\/pre>/i,
  /<div[^>]*id="[^"]*transcript[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*output[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  /<div[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/div>/i
];

/**
 * HTML form parsing patterns
 * These patterns extract form information from HTML
 */
export const FORM_PARSING_PATTERNS = {
  FORM_MATCH: /<form[^>]*>[\s\S]*?<\/form>/gi,
  ACTION_MATCH: /action="([^"]*)"/i,
  METHOD_MATCH: /method="([^"]*)"/i,
  INPUT_MATCH: /<input[^>]*>/gi,
  NAME_MATCH: /name="([^"]*)"/i,
  TYPE_MATCH: /type="([^"]*)"/i,
  VALUE_MATCH: /value="([^"]*)"/i,
  ENDPOINT_MATCH: /["'](\/api\/[^"']+)["']/g
};

/**
 * Utility function to extract video ID from YouTube URL
 * @param url - The YouTube URL to parse
 * @returns The video ID or null if not found
 */
export function extractVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Utility function to validate YouTube URL
 * @param url - The URL to validate
 * @returns True if it's a valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
}

/**
 * Utility function to detect language from text
 * @param text - The text to analyze
 * @returns The detected language name
 */
export function detectLanguage(text: string): string {
  if (LANGUAGE_DETECTION_PATTERNS.ARABIC.test(text)) return LANGUAGE_NAMES.ARABIC;
  if (LANGUAGE_DETECTION_PATTERNS.CHINESE.test(text)) return LANGUAGE_NAMES.CHINESE;
  if (LANGUAGE_DETECTION_PATTERNS.JAPANESE.test(text)) return LANGUAGE_NAMES.JAPANESE;
  if (LANGUAGE_DETECTION_PATTERNS.KOREAN.test(text)) return LANGUAGE_NAMES.KOREAN;
  if (LANGUAGE_DETECTION_PATTERNS.THAI.test(text)) return LANGUAGE_NAMES.THAI;
  if (LANGUAGE_DETECTION_PATTERNS.HINDI.test(text)) return LANGUAGE_NAMES.HINDI;
  return LANGUAGE_NAMES.ENGLISH;
}

/**
 * Utility function to check if text is non-English
 * @param text - The text to check
 * @returns True if the text appears to be non-English
 */
export function isNonEnglish(text: string): boolean {
  return LANGUAGE_DETECTION_PATTERNS.NON_ENGLISH.test(text);
} 
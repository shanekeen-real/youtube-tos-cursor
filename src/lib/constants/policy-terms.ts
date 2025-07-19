/**
 * Centralized constants for policy terms and highlighting
 * This file contains all hardcoded arrays that were previously embedded in components
 */

/**
 * Terms that should always be highlighted (truly high-risk)
 * These terms are considered high-risk regardless of context
 */
export const ALWAYS_HIGHLIGHT_KEYWORDS = [
  'hitler', 'nazi', 'fascist', 'adolf', 'terrorist', 'terrorism', 'extremist', 'radical',
  'supremacist', 'pedophile', 'pedophilia', 'child exploitation', 'child abuse',
  'suicide', 'self-harm', 'cutting', 'eating disorder', 'animal abuse', 'animal cruelty',
  'torture', 'murder', 'rape', 'incest', 'bestiality', 'zoophilia', 'revenge porn',
  'nonconsensual', 'doxxing', 'swatting', 'stalking', 'grooming', 'human trafficking',
  'bomb', 'explosive', 'weapon', 'gun', 'firearm', 'illegal drugs', 'drug trafficking',
  'scam', 'fraud', 'identity theft', 'blackmail', 'money laundering', 'organized crime',
  'qanon', 'deep state', 'pizzagate', 'chemtrails', 'flat earth', 'illuminati'
] as const;

/**
 * Recognized content contexts that can affect term highlighting
 * These contexts may downgrade certain terms from high to medium risk
 */
export const RECOGNIZED_CONTEXTS = [
  'gaming', 'educational', 'entertainment', 'news', 'music', 'comedy', 
  'tutorial', 'review', 'vlog', 'documentary', 'sports', 'technology', 
  'fashion', 'cooking', 'travel'
] as const;

/**
 * Categories that are always high risk, regardless of context
 * These categories will always be highlighted as high severity
 */
export const ALWAYS_RED_CATEGORIES = [
  'HATE_SPEECH', 'TERRORISM', 'CHILD_SAFETY', 'SEXUAL_CONTENT', 'GRAPHIC_VIOLENCE',
  'ILLEGAL_ACTIVITY', 'EXTREMISM', 'EXPLOITATION', 'SELF_HARM', 'SUICIDE',
  'ANIMAL_CRUELTY', 'HUMAN_TRAFFICKING', 'ABUSE', 'HARASSMENT', 'BULLYING',
  'THREATS', 'DOXXING', 'NON_CONSENSUAL', 'TORTURE', 'MURDER', 'RAPE',
  'INCITEMENT', 'VIOLENT_CRIME', 'CHILD_EXPLOITATION', 'CHILD_ABUSE',
  'CHILD_PORNOGRAPHY', 'CSA', 'CP', 'CSAM', 'TERROR', 'BOMB', 'BOMBING',
  'MASS_SHOOTING', 'MASSACRE', 'GENOCIDE', 'NAZI', 'FASCIST', 'ADOLF',
  'HITLER', 'ISIS', 'AL_QAEDA', 'AL-QAEDA', 'ISIL', 'ISLAMIC_STATE',
  'JIHAD', 'EXTREMIST', 'RADICALIZATION', 'RADICALISATION', 'TERRORIST',
  'TERRORISM', 'BOMB_MAKING', 'EXPLOSIVES', 'WEAPONS_TRADE', 'ARMS_DEALING',
  'ILLEGAL_WEAPONS', 'ILLEGAL_DRUGS', 'DRUG_TRAFFICKING', 'HUMAN_SMUGGLING',
  'ORGANIZED_CRIME', 'MONEY_LAUNDERING', 'SCAM', 'FRAUD', 'IDENTITY_THEFT',
  'BLACKMAIL', 'REVENGE_PORN', 'NONCONSENSUAL', 'REVENGE', 'DOX', 'DOXX',
  'DOXXING', 'SWATTING', 'STALKING', 'GROOMING', 'PEDOPHILIA', 'PEDOPHILE',
  'PEDO', 'CHILD', 'MINOR', 'UNDERAGE'
] as const;

/**
 * Performance configuration constants
 */
export const PERFORMANCE_CONFIG = {
  // Maximum number of phrases to include in regex pattern
  MAX_REGEX_PHRASES: 50,
  
  // Cache size limit for regex patterns
  REGEX_CACHE_SIZE_LIMIT: 100,
  
  // Chunk size for large text processing (in characters)
  TEXT_CHUNK_SIZE: 10000,
  
  // Minimum time between API calls (in milliseconds)
  API_CALL_THROTTLE: 1000,
  
  // Maximum retry attempts for session waiting
  MAX_SESSION_RETRIES: 20,
  
  // Retry delay for session waiting (in milliseconds)
  SESSION_RETRY_DELAY: 200
} as const;

/**
 * Content type sensitivity multipliers for AI detection
 */
export const CONTENT_TYPE_SENSITIVITY_MULTIPLIERS = {
  'gaming': 0.6,      // Gaming content is less likely to be AI-generated
  'educational': 0.8,  // Educational content may have some structure
  'entertainment': 0.7, // Entertainment content varies
  'news': 0.9,        // News content may be more structured
  'music': 0.5,       // Music content is very unlikely to be AI-generated
  'comedy': 0.6,      // Comedy content is usually human
  'tutorial': 0.8,    // Tutorial content may have structure
  'review': 0.7,      // Review content varies
  'vlog': 0.4,        // Vlog content is very human
  'documentary': 0.8, // Documentary content may be structured
  'sports': 0.5,      // Sports content is usually human
  'technology': 0.8,  // Technology content may be structured
  'fashion': 0.6,     // Fashion content varies
  'cooking': 0.5,     // Cooking content is usually human
  'travel': 0.5       // Travel content is usually human
} as const; 
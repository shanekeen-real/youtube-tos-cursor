/**
 * Centralized constants for false positive words
 * These words should not be flagged as risky content during analysis
 * Organized by category for better maintainability
 */

/**
 * Common everyday words that should not be flagged
 * These are basic vocabulary words that appear frequently in normal content
 */
export const COMMON_WORDS = [
  'you', 'worried', 'rival', 'team', 'player', 'goal', 'score', 'match', 'game', 'play',
  'win', 'lose', 'good', 'bad', 'big', 'small', 'new', 'old', 'first', 'last', 'best', 'worst',
  'money', 'dollar', 'price', 'cost', 'value', 'worth', 'expensive', 'cheap', 'million', 'billion',
  'year', 'month', 'week', 'day', 'time', 'people', 'person', 'thing', 'way', 'day', 'work',
  'make', 'take', 'get', 'go', 'come', 'see', 'know', 'think', 'feel', 'want', 'need', 'like',
  'look', 'say', 'tell', 'ask', 'give', 'find', 'use', 'try', 'call', 'help', 'start', 'stop',
  'keep', 'put', 'bring', 'turn', 'move', 'change', 'show', 'hear', 'play', 'run', 'walk',
  'sit', 'stand', 'wait', 'watch', 'read', 'write', 'speak', 'talk', 'listen', 'learn', 'teach',
  'buy', 'sell', 'pay', 'earn', 'spend', 'save', 'lose', 'win', 'beat', 'hit', 'catch', 'throw',
  'kick', 'run', 'jump', 'swim', 'dance', 'sing', 'laugh', 'cry', 'smile', 'frown', 'love', 'hate',
  'like', 'dislike', 'happy', 'sad', 'angry', 'excited', 'bored', 'tired', 'hungry', 'thirsty',
  'hot', 'cold', 'warm', 'cool', 'fast', 'slow', 'quick', 'easy', 'hard', 'simple', 'complex',
  'right', 'wrong', 'true', 'false', 'yes', 'no', 'maybe', 'sure', 'okay', 'fine', 'great', 'awesome'
];

/**
 * Family and relationship terms that are commonly harmless
 * These appear frequently in family-friendly content
 */
export const FAMILY_TERMS = [
  'kid', 'kids', 'child', 'children', 'boy', 'girl', 'son', 'daughter',
  'family', 'parent', 'mom', 'dad', 'mother', 'father', 'sister', 'brother', 'baby', 'toddler',
  'teen', 'teenager', 'youth', 'young', 'old', 'elderly', 'senior', 'adult', 'grown', 'grownup',
  'friend', 'buddy', 'pal', 'mate', 'colleague', 'neighbor', 'cousin', 'uncle', 'aunt', 'grandma',
  'grandpa', 'grandmother', 'grandfather', 'nephew', 'niece', 'relative', 'relation', 'family'
];

/**
 * Technology and device terms that are commonly harmless
 * These appear frequently in tech-related content
 */
export const TECHNOLOGY_TERMS = [
  'phone', 'device', 'mobile', 'cell', 'smartphone', 'iphone', 'android', 'tablet', 'computer', 'laptop', 'desktop',
  'screen', 'display', 'monitor', 'keyboard', 'mouse', 'touch', 'tap', 'swipe', 'click', 'type',
  'text', 'message', 'call', 'ring', 'dial', 'number', 'contact', 'address', 'email', 'mail'
];

/**
 * Home and location terms that are commonly harmless
 * These appear frequently in lifestyle content
 */
export const HOME_TERMS = [
  'home', 'house', 'room', 'bedroom', 'kitchen', 'bathroom', 'living', 'dining', 'office', 'work',
  'school', 'class', 'teacher', 'student', 'classroom', 'homework', 'study', 'learn', 'education'
];

/**
 * Combined array of all false positive words
 * This is the main export used by the analysis system
 */
export const FALSE_POSITIVE_WORDS = [
  ...COMMON_WORDS,
  ...FAMILY_TERMS,
  ...TECHNOLOGY_TERMS,
  ...HOME_TERMS
];

/**
 * Performance optimization: Create a Set for faster lookups
 * This provides O(1) lookup time instead of O(n) array search
 */
export const FALSE_POSITIVE_SET = new Set(FALSE_POSITIVE_WORDS.map(word => word.toLowerCase()));

/**
 * Utility function to check if a phrase contains false positive words
 * @param phrase - The phrase to check
 * @returns True if the phrase contains false positive words
 */
export function containsFalsePositive(phrase: string): boolean {
  const lowerPhrase = phrase.toLowerCase();
  return FALSE_POSITIVE_WORDS.some(falsePositive => 
    lowerPhrase.includes(falsePositive.toLowerCase())
  );
}

/**
 * Utility function to filter out false positive phrases from an array
 * @param phrases - Array of phrases to filter
 * @returns Filtered array without false positive phrases
 */
export function filterFalsePositives(phrases: string[]): string[] {
  return phrases.filter(phrase => !containsFalsePositive(phrase));
} 
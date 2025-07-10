// Centralized false positive filtering utility
// This file contains the logic to filter out harmless words that shouldn't be flagged as policy violations

export const FALSE_POSITIVE_WORDS = [
  // Common pronouns and basic words
  'you', 'worried', 'rival', 'team', 'player', 'goal', 'score', 'match', 'game', 'play', 
  'win', 'lose', 'good', 'bad', 'big', 'small', 'new', 'old', 'first', 'last', 'best', 'worst',
  
  // Financial terms
  'money', 'dollar', 'price', 'cost', 'value', 'worth', 'expensive', 'cheap', 'million', 'billion',
  
  // Time and measurement
  'year', 'month', 'week', 'day', 'time', 'people', 'person', 'thing', 'way', 'day', 'work',
  
  // Common action words
  'make', 'take', 'get', 'go', 'come', 'see', 'know', 'think', 'feel', 'want', 'need', 'like',
  'look', 'say', 'tell', 'ask', 'give', 'find', 'use', 'try', 'call', 'help', 'start', 'stop',
  'keep', 'put', 'bring', 'turn', 'move', 'change', 'show', 'hear', 'play', 'run', 'walk',
  'sit', 'stand', 'wait', 'watch', 'read', 'write', 'speak', 'talk', 'listen', 'learn', 'teach',
  
  // Sports and activities
  'buy', 'sell', 'pay', 'earn', 'spend', 'save', 'lose', 'win', 'beat', 'hit', 'catch', 'throw',
  'kick', 'run', 'jump', 'swim', 'dance', 'sing', 'laugh', 'cry', 'smile', 'frown', 'love', 'hate',
  'like', 'dislike', 'happy', 'sad', 'angry', 'excited', 'bored', 'tired', 'hungry', 'thirsty',
  
  // Descriptive words
  'hot', 'cold', 'warm', 'cool', 'fast', 'slow', 'quick', 'easy', 'hard', 'simple', 'complex',
  'right', 'wrong', 'true', 'false', 'yes', 'no', 'maybe', 'sure', 'okay', 'fine', 'great', 'awesome',
  
  // Family and child terms (harmless usage)
  'kid', 'kids', 'child', 'children', 'boy', 'girl', 'son', 'daughter',
  'family', 'parent', 'mom', 'dad', 'mother', 'father', 'sister', 'brother', 'baby', 'toddler',
  'teen', 'teenager', 'youth', 'young', 'old', 'elderly', 'senior', 'adult', 'grown', 'grownup',
  
  // Technology terms (harmless usage)
  'phone', 'device', 'mobile', 'cell', 'smartphone', 'iphone', 'android', 'tablet', 'computer', 'laptop', 'desktop',
  'screen', 'display', 'monitor', 'keyboard', 'mouse', 'touch', 'tap', 'swipe', 'click', 'type',
  'text', 'message', 'call', 'ring', 'dial', 'number', 'contact', 'address', 'email', 'mail',
  
  // Location and home terms
  'home', 'house', 'room', 'bedroom', 'kitchen', 'bathroom', 'living', 'dining', 'office', 'work',
  'school', 'class', 'teacher', 'student', 'classroom', 'homework', 'study', 'learn', 'education',
  
  // Relationship terms
  'friend', 'buddy', 'pal', 'mate', 'colleague', 'neighbor', 'cousin', 'uncle', 'aunt', 'grandma',
  'grandpa', 'grandmother', 'grandfather', 'nephew', 'niece', 'relative', 'relation', 'family'
];

// Context validation for family/child terms
export const FAMILY_CHILD_TERMS = [
  'kid', 'kids', 'child', 'children', 'boy', 'girl', 'son', 'daughter', 'baby', 'toddler', 'teen', 'teenager'
];

export const FAMILY_CHILD_PROBLEMATIC_CONTEXTS = [
  'abuse', 'exploitation', 'kidnap', 'traffic', 'porn', 'sexual', 'inappropriate', 'harm', 'danger', 'risk'
];

// Context validation for technology terms
export const TECHNOLOGY_TERMS = [
  'phone', 'device', 'mobile', 'cell', 'smartphone', 'tablet', 'computer', 'laptop'
];

export const TECHNOLOGY_PROBLEMATIC_CONTEXTS = [
  'scam', 'hack', 'virus', 'malware', 'spy', 'track', 'steal', 'illegal', 'fraud', 'phishing'
];

/**
 * Check if a word is a false positive (harmless word that shouldn't be flagged)
 */
export function isFalsePositive(word: string): boolean {
  if (!word || typeof word !== 'string') return false;
  
  const wordLower = word.toLowerCase();
  return FALSE_POSITIVE_WORDS.some(falsePositive => 
    wordLower.includes(falsePositive.toLowerCase())
  );
}

/**
 * Check if a family/child term has problematic context
 */
export function hasFamilyChildProblematicContext(phrase: string): boolean {
  const phraseLower = phrase.toLowerCase();
  
  // Check if it contains family/child terms
  const hasFamilyTerm = FAMILY_CHILD_TERMS.some(term => phraseLower.includes(term));
  if (!hasFamilyTerm) return false;
  
  // Check if it has problematic context
  return FAMILY_CHILD_PROBLEMATIC_CONTEXTS.some(context => phraseLower.includes(context));
}

/**
 * Check if a technology term has problematic context
 */
export function hasTechnologyProblematicContext(phrase: string): boolean {
  const phraseLower = phrase.toLowerCase();
  
  // Check if it contains technology terms
  const hasTechTerm = TECHNOLOGY_TERMS.some(term => phraseLower.includes(term));
  if (!hasTechTerm) return false;
  
  // Check if it has problematic context
  return TECHNOLOGY_PROBLEMATIC_CONTEXTS.some(context => phraseLower.includes(context));
}

/**
 * Comprehensive validation to determine if a phrase should be flagged
 */
export function shouldFlagPhrase(phrase: string): boolean {
  if (!phrase || typeof phrase !== 'string') return false;
  
  // Filter out false positives
  if (isFalsePositive(phrase)) {
    console.log(`Filtering out false positive: "${phrase}"`);
    return false;
  }
  
  // Filter out very short phrases (likely false positives)
  if (phrase.length < 3) return false;
  
  // Filter out common punctuation or formatting artifacts
  if (/^[^\w\s]*$/.test(phrase)) return false;
  
  // Context validation for family/child terms
  if (FAMILY_CHILD_TERMS.some(term => phrase.toLowerCase().includes(term))) {
    if (!hasFamilyChildProblematicContext(phrase)) {
      console.log(`Filtering out family/child term: "${phrase}" - no problematic context found`);
      return false;
    }
  }
  
  // Context validation for technology terms
  if (TECHNOLOGY_TERMS.some(term => phrase.toLowerCase().includes(term))) {
    if (!hasTechnologyProblematicContext(phrase)) {
      console.log(`Filtering out technology term: "${phrase}" - no problematic context found`);
      return false;
    }
  }
  
  return true;
}

/**
 * Filter an array of phrases to remove false positives
 */
export function filterFalsePositives(phrases: string[]): string[] {
  if (!Array.isArray(phrases)) return [];
  
  return phrases.filter(phrase => shouldFlagPhrase(phrase));
} 
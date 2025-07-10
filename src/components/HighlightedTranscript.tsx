import React from 'react';
import he from 'he';
import { YOUTUBE_POLICY_TERMS, findPolicyTerm, getAllTerms } from '@/lib/youtube-policy-terms';
import { filterFalsePositives } from '@/lib/false-positive-filter';

interface HighlightedTranscriptProps {
  content: string;
  riskyPhrases?: string[];
  riskyPhrasesByCategory?: { [category: string]: string[] };
  policyCategories?: { [category: string]: { explanation: string; risk_score?: number } };
  contextAnalysis?: {
    content_type?: string;
    target_audience?: string;
  };
  className?: string;
}

// Helper to map category keys to human-friendly names
const CATEGORY_LABELS: { [key: string]: string } = {
  CONTENT_SAFETY_VIOLENCE: 'Violence & Graphic Content',
  CONTENT_SAFETY_DANGEROUS_ACTS: 'Dangerous Acts & Challenges',
  CONTENT_SAFETY_HARMFUL_CONTENT: 'Harmful or Dangerous Content',
  CONTENT_SAFETY_CHILD_SAFETY: 'Child Safety',
  COMMUNITY_STANDARDS_HARASSMENT: 'Harassment & Cyberbullying',
  COMMUNITY_STANDARDS_HATE_SPEECH: 'Hate Speech',
  COMMUNITY_STANDARDS_SPAM: 'Spam, Deceptive Practices & Scams',
  COMMUNITY_STANDARDS_MISINFORMATION: 'Misinformation',
  ADVERTISER_FRIENDLY_SEXUAL_CONTENT: 'Sexual Content',
  ADVERTISER_FRIENDLY_PROFANITY: 'Profanity & Inappropriate Language',
  ADVERTISER_FRIENDLY_CONTROVERSIAL: 'Controversial or Sensitive Topics',
  ADVERTISER_FRIENDLY_BRAND_SAFETY: 'Brand Safety Issues',
  LEGAL_COMPLIANCE_COPYRIGHT: 'Copyright & Intellectual Property',
  LEGAL_COMPLIANCE_PRIVACY: 'Privacy & Personal Information',
  LEGAL_COMPLIANCE_TRADEMARK: 'Trademark Violations',
  LEGAL_COMPLIANCE_LEGAL_REQUESTS: 'Legal Requests & Compliance',
  MONETIZATION_AD_POLICIES: 'Ad-Friendly Content Guidelines',
  MONETIZATION_SPONSORED_CONTENT: 'Sponsored Content Disclosure',
  MONETIZATION_MONETIZATION_ELIGIBILITY: 'Monetization Eligibility',
};

export default function HighlightedTranscript({ content, riskyPhrases = [], riskyPhrasesByCategory = {}, policyCategories = {}, contextAnalysis, className = '' }: HighlightedTranscriptProps) {
  // Always double-decode the transcript before any processing
  const decoded = he.decode(he.decode(content));

  // Robust paragraph splitting: prefer double newlines, fallback to sentence boundaries
  let paragraphTexts: string[] = [];
  if (decoded.includes('\n\n')) {
    paragraphTexts = decoded.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  } else {
    // Fallback: split by sentence boundaries (period/question/exclamation followed by space and capital)
    paragraphTexts = decoded.split(/(?<=[.!?])\s+(?=[A-Z])/).map(p => p.trim()).filter(Boolean);
  }

  // Helper: Get all recognized content types
  const RECOGNIZED_CONTEXTS = [
    'gaming', 'educational', 'entertainment', 'news', 'music', 'comedy', 'tutorial', 'review', 'vlog', 'documentary', 'sports', 'technology', 'fashion', 'cooking', 'travel'
  ];

  // Context-aware term filtering - returns context info instead of boolean
  function getTermContext(term: string, category: string): { shouldHighlight: boolean; context?: string; severity: 'high' | 'medium' } {
    const contentType = contextAnalysis?.content_type?.toLowerCase() || '';
    const targetAudience = contextAnalysis?.target_audience?.toLowerCase() || '';
    
    // Categories that are always high risk, regardless of context
    const alwaysRedCategories = [
      'HATE_SPEECH',
      'TERRORISM',
      'CHILD_SAFETY',
      'SEXUAL_CONTENT',
      'GRAPHIC_VIOLENCE',
      'ILLEGAL_ACTIVITY',
      'EXTREMISM',
      'EXPLOITATION',
      'SELF_HARM',
      'SUICIDE',
      'ANIMAL_CRUELTY',
      'HUMAN_TRAFFICKING',
      'ABUSE',
      'HARASSMENT',
      'BULLYING',
      'THREATS',
      'DOXXING',
      'NON_CONSENSUAL',
      'TORTURE',
      'MURDER',
      'RAPE',
      'INCITEMENT',
      'VIOLENT_CRIME',
      'CHILD_EXPLOITATION',
      'CHILD_ABUSE',
      'CHILD_PORNOGRAPHY',
      'CSA',
      'CP',
      'CSAM',
      'TERROR',
      'BOMB',
      'BOMBING',
      'MASS_SHOOTING',
      'MASSACRE',
      'GENOCIDE',
      'NAZI',
      'FASCIST',
      'ADOLF',
      'HITLER',
      'ISIS',
      'AL_QAEDA',
      'AL-QAEDA',
      'ISIL',
      'ISLAMIC_STATE',
      'JIHAD',
      'EXTREMIST',
      'RADICALIZATION',
      'RADICALISATION',
      'TERRORIST',
      'TERRORISM',
      'BOMB_MAKING',
      'EXPLOSIVES',
      'WEAPONS_TRADE',
      'ARMS_DEALING',
      'ILLEGAL_WEAPONS',
      'ILLEGAL_DRUGS',
      'DRUG_TRAFFICKING',
      'HUMAN_SMUGGLING',
      'ORGANIZED_CRIME',
      'MONEY_LAUNDERING',
      'SCAM',
      'FRAUD',
      'IDENTITY_THEFT',
      'BLACKMAIL',
      'REVENGE_PORN',
      'NONCONSENSUAL',
      'REVENGE',
      'DOX',
      'DOXX',
      'DOXXING',
      'SWATTING',
      'STALKING',
      'GROOMING',
      'PEDOPHILIA',
      'PEDOPHILE',
      'PEDO',
      'CHILD',
      'MINOR',
      'UNDERAGE',
      'MOLEST',
      'MOLESTATION',
      'INCEST',
      'BESTIALITY',
      'ZOOPHILIA',
      'RACISM',
      'RACIST',
      'SEXISM',
      'SEXIST',
      'HOMOPHOBIA',
      'HOMOPHOBIC',
      'TRANSPHOBIA',
      'TRANSPHOBIC',
      'XENOPHOBIA',
      'XENOPHOBIC',
      'SLUR',
      'SLURS',
      'SLANDER',
      'DEFAMATION',
      'LIBEL',
      'DISCRIMINATION',
      'BIGOTRY',
      'BIGOT',
      'MISOGYNY',
      'MISOGYNIST',
      'MISANDRY',
      'MISANDRIST',
      'ABLEISM',
      'ABLEIST',
      'AGEISM',
      'AGEIST',
      'RELIGIOUS_HATE',
      'RELIGIOUS_INTOLERANCE',
      'RELIGIOUS_PERSECUTION',
      'RELIGIOUS_DISCRIMINATION',
      'RELIGIOUS_BIGOTRY',
      'RELIGIOUS_SLUR',
      'RELIGIOUS_SLURS',
      'RELIGIOUS_HARASSMENT',
      'RELIGIOUS_ABUSE',
      'RELIGIOUS_VIOLENCE',
      'RELIGIOUS_EXTREMISM',
      'RELIGIOUS_TERRORISM',
      'RELIGIOUS_RADICALIZATION',
      'RELIGIOUS_RADICALISATION',
      'RELIGIOUS_TERRORIST',
      'RELIGIOUS_TERRORISM',
      'RELIGIOUS_BOMB',
      'RELIGIOUS_BOMBING',
      'RELIGIOUS_MASS_SHOOTING',
      'RELIGIOUS_MASSACRE',
      'RELIGIOUS_GENOCIDE',
      'RELIGIOUS_NAZI',
      'RELIGIOUS_FASCIST',
      'RELIGIOUS_ADOLF',
      'RELIGIOUS_HITLER',
      'RELIGIOUS_ISIS',
      'RELIGIOUS_AL_QAEDA',
      'RELIGIOUS_AL-QAEDA',
      'RELIGIOUS_ISIL',
      'RELIGIOUS_ISLAMIC_STATE',
      'RELIGIOUS_JIHAD',
      'RELIGIOUS_EXTREMIST',
      'RELIGIOUS_RADICALIZATION',
      'RELIGIOUS_RADICALISATION',
      'RELIGIOUS_TERRORIST',
      'RELIGIOUS_TERRORISM',
      'RELIGIOUS_BOMB_MAKING',
      'RELIGIOUS_EXPLOSIVES',
      'RELIGIOUS_WEAPONS_TRADE',
      'RELIGIOUS_ARMS_DEALING',
      'RELIGIOUS_ILLEGAL_WEAPONS',
      'RELIGIOUS_ILLEGAL_DRUGS',
      'RELIGIOUS_DRUG_TRAFFICKING',
      'RELIGIOUS_HUMAN_SMUGGLING',
      'RELIGIOUS_ORGANIZED_CRIME',
      'RELIGIOUS_MONEY_LAUNDERING',
      'RELIGIOUS_SCAM',
      'RELIGIOUS_FRAUD',
      'RELIGIOUS_IDENTITY_THEFT',
      'RELIGIOUS_BLACKMAIL',
      'RELIGIOUS_REVENGE_PORN',
      'RELIGIOUS_NONCONSENSUAL',
      'RELIGIOUS_REVENGE',
      'RELIGIOUS_DOX',
      'RELIGIOUS_DOXX',
      'RELIGIOUS_DOXXING',
      'RELIGIOUS_SWATTING',
      'RELIGIOUS_STALKING',
      'RELIGIOUS_GROOMING',
      'RELIGIOUS_PEDOPHILIA',
      'RELIGIOUS_PEDOPHILE',
      'RELIGIOUS_PEDO',
      'RELIGIOUS_CHILD',
      'RELIGIOUS_MINOR',
      'RELIGIOUS_UNDERAGE',
      'RELIGIOUS_MOLEST',
      'RELIGIOUS_MOLESTATION',
      'RELIGIOUS_INCEST',
      'RELIGIOUS_BESTIALITY',
      'RELIGIOUS_ZOOPHILIA'];

    // If the category is always red, highlight as high risk
    for (const red of alwaysRedCategories) {
      if (category.toUpperCase().includes(red)) {
        return { shouldHighlight: true, severity: 'high' };
      }
    }

    // If the content type is a recognized context, downgrade to yellow (medium)
    for (const ctx of RECOGNIZED_CONTEXTS) {
      if (contentType.includes(ctx)) {
        return { shouldHighlight: true, context: ctx, severity: 'medium' };
      }
    }
    
    // No context identified - high severity
    return { shouldHighlight: true, severity: 'high' };
  }

  // Helper: For a phrase, find the most relevant category and explanation using the policy terms database
  function getPhraseCategoryAndExplanation(phrase: string): { label: string; explanation: string; context?: string; severity: 'high' | 'medium' } | null {
    const policyTerm = findPolicyTerm(phrase);
    if (!policyTerm) return null;
    
    // Get context information for this term
    const termContext = getTermContext(phrase, policyTerm.category);
    if (!termContext.shouldHighlight) {
      return null;
    }
    
    const label = CATEGORY_LABELS[policyTerm.category] || policyTerm.category.replace(/_/g, ' ');
    return { 
      label, 
      explanation: policyTerm.explanation,
      context: termContext.context,
      severity: termContext.severity
    };
  }

  // Helper: Highlight all risky phrases in a paragraph
  function highlightPhrases(para: string, phrases: string[]) {
    if (!phrases.length) return [para];
    
    // Get all terms from the policy database for comprehensive scanning
    const allPolicyTerms = getAllTerms();
    const individualRiskyWords = new Set<string>();
    
    // Process AI-detected phrases first
    phrases.forEach(phrase => {
      const phraseLower = phrase.toLowerCase();
      
      // Check if the phrase itself is a policy term
      if (allPolicyTerms.includes(phraseLower)) {
        individualRiskyWords.add(phraseLower);
      }
      
      // Check if the phrase contains any policy terms
      allPolicyTerms.forEach(keyword => {
        if (phraseLower.includes(keyword.toLowerCase())) {
          individualRiskyWords.add(keyword);
        }
      });
      
      // Add the original phrase if it's reasonable length
      if (phrase.length <= 50) {
        individualRiskyWords.add(phrase);
      }
    });
    
    // Comprehensive fallback: scan the entire paragraph for any policy terms
    const transcriptLower = para.toLowerCase();
    
    allPolicyTerms.forEach(keyword => {
      if (transcriptLower.includes(keyword.toLowerCase())) {
        individualRiskyWords.add(keyword);
      }
    });
    
    // Debug logging
    console.log('Original phrases:', phrases);
    console.log('All detected risky words:', Array.from(individualRiskyWords));
    
    // Separate policy terms into different categories for different filtering logic
    const alwaysHighlightTerms = new Set<string>(); // Truly high-risk terms
    const contextAwareTerms = new Set<string>();    // Terms that need context checking
    const aiDetectedPhrases = new Set<string>();    // AI-detected phrases
    
    // Define terms that should always be highlighted (truly high-risk)
    const alwaysHighlightKeywords = [
      'hitler', 'nazi', 'fascist', 'adolf', 'terrorist', 'terrorism', 'extremist', 'radical',
      'supremacist', 'pedophile', 'pedophilia', 'child exploitation', 'child abuse',
      'suicide', 'self-harm', 'cutting', 'eating disorder', 'animal abuse', 'animal cruelty',
      'torture', 'murder', 'rape', 'incest', 'bestiality', 'zoophilia', 'revenge porn',
      'nonconsensual', 'doxxing', 'swatting', 'stalking', 'grooming', 'human trafficking',
      'bomb', 'explosive', 'weapon', 'gun', 'firearm', 'illegal drugs', 'drug trafficking',
      'scam', 'fraud', 'identity theft', 'blackmail', 'money laundering', 'organized crime',
      'qanon', 'deep state', 'pizzagate', 'chemtrails', 'flat earth', 'illuminati'
    ];
    
    Array.from(individualRiskyWords).forEach(phrase => {
      const phraseLower = phrase.toLowerCase();
      
      if (alwaysHighlightKeywords.some(keyword => phraseLower.includes(keyword))) {
        // This is a truly high-risk term - always highlight
        alwaysHighlightTerms.add(phrase);
      } else if (allPolicyTerms.includes(phraseLower)) {
        // This is a policy term but not in always-highlight list - apply context filtering
        contextAwareTerms.add(phrase);
      } else {
        // This is an AI-detected phrase - apply false positive filtering
        aiDetectedPhrases.add(phrase);
      }
    });
    
    // Filter context-aware terms using false positive filter
    const filteredContextTerms = filterFalsePositives(Array.from(contextAwareTerms));
    
    // Filter AI-detected phrases using false positive filter
    const filteredAiPhrases = filterFalsePositives(Array.from(aiDetectedPhrases));
    
    // Combine all filtered terms
    const allValidPhrases = Array.from(alwaysHighlightTerms).concat(filteredContextTerms).concat(filteredAiPhrases);
    
    // Final validation: ensure all phrases have valid category explanations
    const validPhrases = allValidPhrases.filter(phrase => {
      const phraseInfo = getPhraseCategoryAndExplanation(phrase);
      return phraseInfo !== null;
    });
    
    console.log('Always highlight terms (truly high-risk):', Array.from(alwaysHighlightTerms));
    console.log('Context-aware terms (after false positive filtering):', filteredContextTerms);
    console.log('AI phrases (after false positive filtering):', filteredAiPhrases);
    console.log('Valid phrases for highlighting (final):', validPhrases);
    
    if (!validPhrases.length) return [para];
    
    // Sort phrases by length descending to avoid nested highlights
    const sortedPhrases = [...validPhrases].sort((a, b) => b.length - a.length);
    
    // Build a robust regex pattern
    const regexPattern = sortedPhrases
      .map(phrase => {
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Use word boundaries for single words, allow partial matches for phrases
        return phrase.trim().split(' ').length === 1 ? `\\b${escaped}\\b` : escaped;
      })
      .join('|');
    
    console.log('Final regex pattern:', regexPattern);
    
    const regex = new RegExp(regexPattern, 'gi');
    const result: (string | React.ReactElement)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(para)) !== null) {
      if (match.index > lastIndex) {
        result.push(para.slice(lastIndex, match.index));
      }
      
      const matchedText = match[0];
      const phraseInfo = getPhraseCategoryAndExplanation(matchedText);
      
      if (phraseInfo) {
        // Generate context-aware tooltip
        let tooltip: string;
        let className: string;
        
        if (phraseInfo.context) {
          // Context identified - yellow highlighting with context-aware tooltip
          tooltip = `${phraseInfo.label}: ${phraseInfo.explanation} (Appears in ${phraseInfo.context} context - should be fine but consider limiting for maximum advertiser reach)`;
          className = "inline-block px-1 py-0.5 rounded border bg-yellow-100 border-yellow-300 text-yellow-800 text-xs font-medium cursor-help";
        } else {
          // No context identified - red highlighting with standard tooltip
          tooltip = `${phraseInfo.label}: ${phraseInfo.explanation} (which can limit monetization and advertising possibilities regardless of context)`;
          className = "inline-block px-1 py-0.5 rounded border bg-red-100 border-red-300 text-red-800 text-xs font-medium cursor-help";
        }
        
        result.push(
          <span
            key={match.index}
            className={className}
            title={tooltip}
          >
            {matchedText}
          </span>
        );
      } else {
        // Fallback for unmatched terms
        result.push(matchedText);
      }
      
      lastIndex = match.index + matchedText.length;
    }
    
    if (lastIndex < para.length) {
      result.push(para.slice(lastIndex));
    }
    
    return result;
  }

  // Build highlighted paragraphs
  const paragraphs = paragraphTexts.map((para, idx) => (
    <p key={idx} style={{ marginBottom: '1em' }}>{highlightPhrases(para, riskyPhrases)}</p>
  ));

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 text-caption text-gray-800 max-h-48 overflow-auto ${className}`}>
      {paragraphs}
    </div>
  );
} 
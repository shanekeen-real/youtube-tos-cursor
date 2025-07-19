import he from 'he';

/**
 * Decodes HTML entities in transcript content
 * Always double-decode to handle nested entities
 */
export function decodeTranscript(content: string): string {
  return he.decode(he.decode(content));
}

/**
 * Splits transcript content into logical paragraphs
 * Handles various transcript formats and structures
 */
export function splitIntoParagraphs(decoded: string): string[] {
  let paragraphTexts: string[] = [];
  
  if (decoded.match(/\n\s*\n/)) {
    // Double line breaks indicate paragraph breaks
    paragraphTexts = decoded.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  } else if (decoded.match(/\n/)) {
    // Single line breaks - group lines into paragraphs
    const lines = decoded.split(/\n/).map(l => l.trim()).filter(Boolean);
    let currentPara: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      currentPara.push(lines[i]);
      const isEnd = /[.!?]$/.test(lines[i]);
      if (isEnd || currentPara.length >= 4) {
        paragraphTexts.push(currentPara.join(' '));
        currentPara = [];
      }
    }
    
    if (currentPara.length > 0) {
      paragraphTexts.push(currentPara.join(' '));
    }
  } else {
    // No line breaks - try sentence boundaries
    paragraphTexts = decoded.split(/(?<=[.!?])\s+(?=[A-Z])/).map(p => p.trim()).filter(Boolean);
    
    // If still only one big block, chunk by word count
    if (paragraphTexts.length <= 1 && decoded.length > 0) {
      const words = decoded.split(/\s+/);
      const chunkSize = 50;
      for (let i = 0; i < words.length; i += chunkSize) {
        paragraphTexts.push(words.slice(i, i + chunkSize).join(' '));
      }
    }
  }
  
  return paragraphTexts;
} 
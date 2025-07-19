import React from 'react';
import { decodeTranscript, splitIntoParagraphs } from '@/lib/transcript/text-processing';
import TranscriptHighlighter from './TranscriptHighlighter';
import { HighlightedTranscriptProps } from './types';

export default function TranscriptViewer({ 
  content, 
  riskyPhrases = [], 
  contextAnalysis, 
  className = '' 
}: HighlightedTranscriptProps) {
  // Always double-decode the transcript before any processing
  const decoded = decodeTranscript(content);

  // Split into logical paragraphs
  const paragraphTexts = splitIntoParagraphs(decoded);

  // Build highlighted paragraphs
  const paragraphs = paragraphTexts.map((para, idx) => (
    <p key={idx} style={{ marginBottom: '1em' }}>
      <TranscriptHighlighter 
        paragraph={para} 
        riskyPhrases={riskyPhrases} 
        contextAnalysis={contextAnalysis}
      />
    </p>
  ));

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 text-caption text-gray-800 max-h-48 overflow-auto ${className}`}>
      {paragraphs}
    </div>
  );
} 
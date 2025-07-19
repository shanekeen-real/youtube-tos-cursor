import React from 'react';
import TranscriptViewer from './transcript/TranscriptViewer';
import { HighlightedTranscriptProps } from './transcript/types';

export default function HighlightedTranscript(props: HighlightedTranscriptProps) {
  return <TranscriptViewer {...props} />;
} 
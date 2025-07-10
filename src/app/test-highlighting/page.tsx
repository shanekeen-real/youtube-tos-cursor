"use client";
import React, { useState } from 'react';
import HighlightedTranscript from '@/components/HighlightedTranscript';

// Mock data for testing
const mockRiskyPhrases = [
  "controversial political statements",
  "hate speech", 
  "graphic violence",
  "misinformation about vaccines",
  "you",  // This should be filtered out as false positive
  "worried", // This should be filtered out as false positive
  "team"  // This should be filtered out as false positive
];

const mockContent = `This video contains some controversial political statements that might be considered hate speech. We also discuss graphic violence in detail and share some misinformation about vaccines. The content includes explicit language and potentially harmful advice. We also mention Hitler and Nazi ideology in historical context. My kid loves playing with his phone and watching videos. The child is learning about technology.`;

export default function TestHighlightingPage() {
  const [content, setContent] = useState(mockContent);
  const [riskyPhrases, setRiskyPhrases] = useState(mockRiskyPhrases);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Highlighting Test Page</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Test Content</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-lg"
          placeholder="Enter test content here..."
        />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Risky Phrases (JSON)</h2>
        <textarea
          value={JSON.stringify(riskyPhrases, null, 2)}
          onChange={(e) => {
            try {
              setRiskyPhrases(JSON.parse(e.target.value));
            } catch (error) {
              // Ignore invalid JSON
            }
          }}
          className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-sm"
          placeholder="Enter risky phrases JSON here..."
        />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Highlighted Transcript</h2>
        <HighlightedTranscript 
          content={content} 
          riskyPhrases={riskyPhrases}
        />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Legend</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded border bg-red-100 border-red-300 text-red-800 text-xs font-medium">
              HIGH Risk
            </span>
            <span className="text-sm text-gray-600">High risk content</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded border bg-yellow-100 border-yellow-300 text-yellow-800 text-xs font-medium">
              MEDIUM Risk
            </span>
            <span className="text-sm text-gray-600">Medium risk content</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-1 rounded border bg-gray-100 border-gray-300 text-gray-800 text-xs font-medium">
              LOW Risk
            </span>
            <span className="text-sm text-gray-600">Low risk content</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Debug Info</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>Content length:</strong> {content.length} characters</p>
          <p><strong>Number of risky phrases:</strong> {riskyPhrases.length}</p>
          <p><strong>Risky phrases:</strong></p>
          <ul className="list-disc list-inside ml-4">
            {riskyPhrases.map((phrase: string, index: number) => (
              <li key={index}>
                "{phrase}"
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 
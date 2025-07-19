'use client';

import { useState } from 'react';
import { Button } from '@/lib/imports';
import { Card } from '@/lib/imports';

export default function TestClaudePage() {
  const [text, setText] = useState('This video contains explicit content and may not be suitable for all advertisers.');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testClaude = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Claude Integration Test</h1>
      
      <Card className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Content</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-32 p-3 border rounded-lg"
          placeholder="Enter content to analyze..."
        />
        <Button 
          onClick={testClaude} 
          disabled={loading}
          className="mt-4"
        >
          {loading ? 'Testing...' : 'Test Claude Analysis'}
        </Button>
      </Card>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <h2 className="text-xl font-semibold mb-4 text-red-800">Error</h2>
          <p className="text-red-700">{error}</p>
        </Card>
      )}

      {result && (
        <Card>
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-4">
            <div>
              <strong>Model Used:</strong> {result.model_used}
            </div>
            <div>
              <strong>Risk Score:</strong> {result.risk_score}
            </div>
            <div>
              <strong>Risk Level:</strong> {result.risk_level}
            </div>
            <div>
              <strong>Confidence Score:</strong> {result.confidence_score}
            </div>
            <div>
              <strong>Processing Time:</strong> {result.processing_time_ms}ms
            </div>
            <div>
              <strong>Content Length:</strong> {result.content_length} characters
            </div>
            
            {result.highlights && result.highlights.length > 0 && (
              <div>
                <strong>Highlights:</strong>
                <ul className="list-disc list-inside mt-2">
                  {result.highlights.map((highlight: any, index: number) => (
                    <li key={index}>
                      {highlight.category}: {highlight.risk} (Score: {highlight.score})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <strong>Suggestions:</strong>
                <ul className="list-disc list-inside mt-2">
                  {result.suggestions.map((suggestion: any, index: number) => (
                    <li key={index}>
                      <strong>{suggestion.title}:</strong> {suggestion.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
} 
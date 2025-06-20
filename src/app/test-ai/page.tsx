"use client";
import React, { useState } from 'react';

export default function TestAIPage() {
  const [text, setText] = useState('This video contains explicit content and may not be suitable for all advertisers.');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze-policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error + ': ' + data.details);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">AI Integration Test</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Test Policy Text:</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-32 border border-gray-300 rounded-lg p-3 resize-none"
            placeholder="Enter YouTube policy text to test..."
          />
        </div>

        <button
          onClick={testAI}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing AI...' : 'Test AI Analysis'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">AI Test Results:</h2>
            <div className="bg-gray-100 p-4 rounded-lg">
              <p><strong>Risk Score:</strong> {result.risk_score}%</p>
              <p><strong>Risk Level:</strong> <span className={`font-bold ${result.risk_level === 'high' ? 'text-red-600' : result.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{result.risk_level.toUpperCase()}</span></p>
              <p><strong>Flagged Section:</strong> {result.flagged_section}</p>
            </div>
            
            {result.highlights && result.highlights.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Risk Highlights:</h3>
                <div className="space-y-2">
                  {result.highlights.map((highlight: any, index: number) => (
                    <div key={index} className="bg-gray-100 p-3 rounded-lg">
                      <p><strong>{highlight.category}:</strong> {highlight.score}% confidence</p>
                      <p className="text-sm text-gray-600">{highlight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions && result.suggestions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Suggestions:</h3>
                <div className="space-y-2">
                  {result.suggestions.map((suggestion: any, index: number) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
                      <p className="font-semibold">{suggestion.title}</p>
                      <p className="text-sm mt-1">{suggestion.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Raw Analysis Data:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
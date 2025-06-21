"use client";
import React, { useState } from 'react';

export default function TestYtdlPage() {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testYtdl = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test-ytdl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
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
        <h1 className="text-3xl font-bold mb-8">ytdl-core Transcript Test</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">YouTube URL:</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-12 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter YouTube URL to test..."
          />
        </div>

        <button
          onClick={testYtdl}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {loading ? 'Testing...' : 'Test ytdl-core'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-green-800">Test Results:</h3>
            
            <div className="space-y-3">
              <div>
                <strong>Video Title:</strong> {result.videoTitle}
              </div>
              <div>
                <strong>Video Length:</strong> {result.videoLength} seconds
              </div>
              <div>
                <strong>Has Transcript:</strong> {result.hasTranscript ? '✅ Yes' : '❌ No'}
              </div>
              <div>
                <strong>Transcript Length:</strong> {result.transcriptLength} characters
              </div>
              <div>
                <strong>Caption Tracks Available:</strong> {result.captionTracks}
              </div>
              
              {result.transcriptPreview && (
                <div>
                  <strong>Transcript Preview:</strong>
                  <div className="mt-2 p-3 bg-white border rounded text-sm">
                    {result.transcriptPreview}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">Raw Response:</h4>
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
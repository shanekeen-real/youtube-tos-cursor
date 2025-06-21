"use client";
import React, { useState } from 'react';
import axios from 'axios';

export default function TestExternalTranscriptPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testExternalAPIs = async () => {
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/test-external-transcript', { url });
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">External Transcript API Test</h1>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">YouTube URL:</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full h-12 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter YouTube URL to test external APIs..."
          />
        </div>

        <button
          onClick={testExternalAPIs}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
        >
          {loading ? 'Testing APIs...' : 'Test External APIs'}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-green-800">Test Results:</h3>
            
            <div className="space-y-4">
              <div>
                <strong>Video ID:</strong> {result.videoId}
              </div>
              
              <div>
                <strong>Summary:</strong>
                <ul className="mt-2 space-y-1">
                  <li>youtube-transcript.io: {result.summary.youtubeTranscriptIO_working ? '✅ Working' : '❌ Failed'}</li>
                  <li>youtubetotranscript.com: {result.summary.youtubeToTranscript_working ? '✅ Working' : '❌ Failed'}</li>
                  <li>Working APIs: {result.summary.working_apis.length > 0 ? result.summary.working_apis.join(', ') : 'None'}</li>
                </ul>
              </div>

              {result.tests.youtubeTranscriptIO.success && (
                <div>
                  <strong>youtube-transcript.io Result:</strong>
                  <div className="mt-2 p-3 bg-white border rounded">
                    <div>Length: {result.tests.youtubeTranscriptIO.length} characters</div>
                    <div className="mt-2 text-sm">
                      <strong>Preview:</strong>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {result.tests.youtubeTranscriptIO.transcript.substring(0, 300)}...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result.tests.youtubeToTranscript.success && (
                <div>
                  <strong>youtubetotranscript.com Result:</strong>
                  <div className="mt-2 p-3 bg-white border rounded">
                    <div>Length: {result.tests.youtubeToTranscript.length} characters</div>
                    <div className="mt-2 text-sm">
                      <strong>Preview:</strong>
                      <div className="mt-1 p-2 bg-gray-50 rounded">
                        {result.tests.youtubeToTranscript.transcript.substring(0, 300)}...
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!result.tests.youtubeTranscriptIO.success && (
                <div>
                  <strong>youtube-transcript.io Error:</strong>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    {result.tests.youtubeTranscriptIO.error}
                  </div>
                </div>
              )}

              {!result.tests.youtubeToTranscript.success && (
                <div>
                  <strong>youtubetotranscript.com Error:</strong>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                    {result.tests.youtubeToTranscript.error}
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
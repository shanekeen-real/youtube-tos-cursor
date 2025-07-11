"use client";
import React, { useState } from 'react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Badge from '@/components/Badge';

const testCases = [
  {
    name: 'Personal Gaming Story',
    text: 'Hey guys, so today I was playing this new game and I had this absolutely insane experience. I was exploring this hidden area of the map, right? And I found this secret boss that nobody knew about. It was crazy! I was literally shaking when I beat it. The whole thing took me like three hours, and I was so hyped when I finally got the achievement. You know what I mean? Like, that feeling when you discover something completely new in a game you thought you knew everything about.',
    expectedType: 'gaming',
    expectedLowAI: true
  },
  {
    name: 'Personal Vlog Content',
    text: 'So today I wanted to share something really personal with you all. I\'ve been going through some stuff lately, you know? Life just throws you these curveballs sometimes. I was thinking about it this morning while I was making my coffee, and I realized that maybe I should talk about it. It\'s not easy to be vulnerable online, but I feel like if I can help even one person by sharing my story, then it\'s worth it.',
    expectedType: 'vlog',
    expectedLowAI: true
  },
  {
    name: 'Educational Tutorial',
    text: 'In this tutorial, we will explore the fundamental principles of machine learning algorithms. We will cover three main categories: supervised learning, unsupervised learning, and reinforcement learning. Each category has distinct characteristics and applications in the field of artificial intelligence.',
    expectedType: 'educational',
    expectedLowAI: true
  },
  {
    name: 'Generic AI-Generated Content',
    text: 'The implementation of machine learning algorithms requires careful consideration of various parameters. The optimization process involves iterative refinement of model parameters to achieve optimal performance metrics. Statistical analysis reveals significant improvements in accuracy when utilizing advanced neural network architectures.',
    expectedType: 'technology',
    expectedLowAI: false
  }
];

export default function TestAIImprovementsPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAIDetection = async (testCase: typeof testCases[0]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-ai-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testCase.text,
          contentType: testCase.expectedType
        }),
      });

      const data = await response.json();
      
      setResults(prev => [...prev, {
        testCase,
        result: data.analysis,
        success: data.success
      }]);
    } catch (error) {
      console.error('Test failed:', error);
      setResults(prev => [...prev, {
        testCase,
        result: null,
        success: false,
        error: error
      }]);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    for (const testCase of testCases) {
      await testAIDetection(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const getAIColor = (probability: number) => {
    if (probability > 70) return 'bg-red-500';
    if (probability > 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-display font-bold text-gray-800 mb-4">
            AI Detection Improvements Test
          </h1>
          <p className="text-subtitle text-gray-600">
            Testing the improved AI detection system with context-aware analysis and reduced false positives.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <h2 className="text-title font-semibold text-gray-800 mb-4">Test Cases</h2>
            <div className="space-y-4">
              {testCases.map((testCase, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">{testCase.name}</h3>
                    <Badge variant="neutral" className="text-xs">
                      {testCase.expectedType}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {testCase.text.substring(0, 150)}...
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      Expected: {testCase.expectedLowAI ? 'Low AI' : 'High AI'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => testAIDetection(testCase)}
                      disabled={loading}
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button onClick={runAllTests} disabled={loading} className="w-full">
                {loading ? 'Running Tests...' : 'Run All Tests'}
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-title font-semibold text-gray-800 mb-4">Results</h2>
            <div className="space-y-4">
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No test results yet. Run a test to see the improved AI detection in action.
                </div>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-800">{result.testCase.name}</h3>
                      {result.success ? (
                        <Badge variant="safe" className="text-xs">Success</Badge>
                      ) : (
                        <Badge variant="risk" className="text-xs">Failed</Badge>
                      )}
                    </div>
                    
                    {result.success && result.result ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">AI Probability:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getAIColor(result.result.ai_detection?.probability || 0)}`}
                                style={{ width: `${result.result.ai_detection?.probability || 0}%` }}
                              />
                            </div>
                            <span className="font-semibold text-gray-800">
                              {result.result.ai_detection?.probability || 0}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div>Content Type: <span className="font-medium">{result.result.content_type}</span></div>
                          <div>Confidence: <span className="font-medium">{result.result.ai_detection?.confidence || 0}%</span></div>
                        </div>
                        
                        <div className="text-xs text-gray-600">
                          <div className="font-medium mb-1">Analysis:</div>
                          <div>{result.result.ai_detection?.explanation || 'No explanation available'}</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Expected:</span>
                          <Badge 
                            variant={result.testCase.expectedLowAI ? "safe" : "risk"} 
                            className="text-xs"
                          >
                            {result.testCase.expectedLowAI ? 'Low AI' : 'High AI'}
                          </Badge>
                          <span className="text-xs text-gray-500">→</span>
                          <Badge 
                            variant={
                              (result.result.ai_detection?.probability || 0) < 30 ? "safe" : 
                              (result.result.ai_detection?.probability || 0) < 60 ? "neutral" : "risk"
                            } 
                            className="text-xs"
                          >
                            {(result.result.ai_detection?.probability || 0) < 30 ? 'Low AI' : 
                             (result.result.ai_detection?.probability || 0) < 60 ? 'Medium AI' : 'High AI'}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-red-600">
                        Test failed: {result.error?.message || 'Unknown error'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="text-title font-semibold text-gray-800 mb-4">Improvements Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">What's Improved</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Content-type aware detection (gaming, vlog, educational)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Established channel bonuses (older channels get lower AI scores)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>More conservative thresholds (fewer false positives)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Better personal voice detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Context-aware pattern recognition</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Detection Criteria</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Unnaturally perfect grammar in casual speech</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Complete absence of personal pronouns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Overly formal tone in casual content</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Exact repetitive sentence structures</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Lack of current cultural references</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 
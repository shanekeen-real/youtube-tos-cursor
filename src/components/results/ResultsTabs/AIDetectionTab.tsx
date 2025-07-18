import React from 'react';
import { Brain, AlertTriangle, Info } from 'lucide-react';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import { ScanData } from '../types';

interface AIDetectionTabProps {
  data: ScanData;
}

export default function AIDetectionTab({ data }: AIDetectionTabProps) {
  if (!data.ai_detection) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Brain className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI Detection Data</h3>
        <p className="text-gray-600 mb-4 max-w-md mx-auto">
          AI content detection analysis was not performed for this scan. This feature requires Advanced membership and channel context data.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Info className="w-4 h-4" />
            <span className="font-medium">Why is this empty?</span>
          </div>
          <p className="text-sm text-gray-600">
            AI detection requires YouTube channel connection and Advanced membership to analyze content patterns and provide detailed insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-title font-bold text-gray-900">AI Content Detection</h3>
          <p className="text-body text-gray-600">Advanced analysis of content generation patterns</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - AI Detection Overview */}
        <div className="flex flex-col gap-6">
          {/* AI Probability Card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -translate-y-16 translate-x-16 opacity-50"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-body font-semibold text-gray-800 mb-1">AI Generation Probability</h4>
                  <p className="text-caption text-gray-600">Likelihood content was AI-generated</p>
                </div>
                <Badge 
                  variant={data.ai_detection.probability > 70 ? 'risk' : data.ai_detection.probability > 40 ? 'yellow' : 'safe'} 
                  className="text-sm"
                >
                  {data.ai_detection.probability > 70 ? 'High' : data.ai_detection.probability > 40 ? 'Medium' : 'Low'} Risk
                </Badge>
              </div>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">{data.ai_detection.probability}%</span>
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-purple-200"></div>
                  <div 
                    className="absolute inset-0 rounded-full border-4 border-purple-500"
                    style={{
                      clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`,
                      transform: `rotate(${(data.ai_detection.probability / 100) * 360}deg)`
                    }}
                  ></div>
                </div>
                <div className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-caption text-gray-600">Human Content</span>
                      <span className="text-caption text-gray-600">AI Generated</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${data.ai_detection.probability}%` }}
                      ></div>
                    </div>
                    <div className="text-caption text-gray-500 text-center">
                      Probability: {data.ai_detection.probability}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Confidence Card */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-blue-600" />
              </div>
              <h4 className="text-body font-semibold text-gray-800">Analysis Confidence</h4>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-caption text-gray-600">Confidence Level</span>
                <span className="text-body font-semibold text-gray-800">{data.ai_detection.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${data.ai_detection.confidence}%` }}
                ></div>
              </div>
              <p className="text-caption text-gray-600">
                {data.ai_detection.confidence > 80 ? 'High confidence in analysis results' :
                 data.ai_detection.confidence > 60 ? 'Moderate confidence in analysis' : 
                 'Low confidence - results may be less reliable'}
              </p>
            </div>
          </Card>

          {/* Summary Card */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-gray-600" />
              </div>
              <h4 className="text-body font-semibold text-gray-800">Analysis Summary</h4>
            </div>
            
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
                <div className="text-body font-medium text-gray-800 mb-2">Content Assessment</div>
                <div className="text-caption text-gray-600">
                  {data.ai_detection.probability > 70 ? 'Content shows clear AI generation patterns' :
                   data.ai_detection.probability > 40 ? 'Some AI patterns detected, but may be acceptable' : 
                   'Content appears naturally human-generated'}
                </div>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Right Column - Detailed Analysis */}
        <div className="flex flex-col gap-6">
          {/* Analysis Indicators - Enhanced */}
          {data.ai_detection.indicators && (
            <Card>
              <div className="space-y-4">
                <div>
                  <h4 className="text-body font-semibold text-gray-800 mb-2">Content Analysis Indicators</h4>
                  <p className="text-caption text-gray-600">Detailed breakdown of content characteristics</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Personal Voice */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-body font-medium text-gray-800">Personal Voice</span>
                      </div>
                      <span className="text-title font-bold text-gray-800">{data.ai_detection.indicators.personal_voice}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 rounded-full"
                        style={{ width: `${data.ai_detection.indicators.personal_voice}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {data.ai_detection.indicators.personal_voice > 70 ? 'Strong personal voice detected' :
                       data.ai_detection.indicators.personal_voice > 40 ? 'Moderate personal elements' : 
                       'Limited personal voice indicators'}
                    </p>
                  </div>

                  {/* Natural Flow */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-body font-medium text-gray-800">Natural Flow</span>
                      </div>
                      <span className="text-title font-bold text-gray-800">{data.ai_detection.indicators.natural_flow}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300 rounded-full"
                        style={{ width: `${data.ai_detection.indicators.natural_flow}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {data.ai_detection.indicators.natural_flow > 70 ? 'Natural conversational flow' :
                       data.ai_detection.indicators.natural_flow > 40 ? 'Some natural transitions' : 
                       'Structured or rigid flow patterns'}
                    </p>
                  </div>

                  {/* Grammar Consistency */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-body font-medium text-gray-800">Grammar Consistency</span>
                      </div>
                      <span className="text-title font-bold text-gray-800">{data.ai_detection.indicators.grammar_consistency}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300 rounded-full"
                        style={{ width: `${data.ai_detection.indicators.grammar_consistency}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {data.ai_detection.indicators.grammar_consistency > 90 ? 'Perfect grammar (AI indicator)' :
                       data.ai_detection.indicators.grammar_consistency > 70 ? 'Good grammar consistency' : 
                       'Natural grammar variations'}
                    </p>
                  </div>

                  {/* Structured Content */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-body font-medium text-gray-800">Structured Content</span>
                      </div>
                      <span className="text-title font-bold text-gray-800">{data.ai_detection.indicators.structured_content}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300 rounded-full"
                        style={{ width: `${data.ai_detection.indicators.structured_content}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {data.ai_detection.indicators.structured_content > 80 ? 'Highly structured (AI indicator)' :
                       data.ai_detection.indicators.structured_content > 50 ? 'Moderate structure' : 
                       'Natural, unstructured flow'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Detected Patterns - Enhanced */}
          {data.ai_detection.patterns && data.ai_detection.patterns.length > 0 && (
            <Card>
              <div className="space-y-4">
                <div>
                  <h4 className="text-body font-semibold text-gray-800 mb-2">Detected AI Patterns</h4>
                  <p className="text-caption text-gray-600">Specific patterns that suggest AI generation</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.ai_detection.patterns.map((pattern: string, index: number) => (
                    <Badge key={index} variant="neutral" className="text-sm bg-red-50 text-red-700 border-red-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Analysis Summary - Enhanced */}
          <Card>
            <div className="space-y-4">
              <div>
                <h4 className="text-body font-semibold text-gray-800 mb-2">Detailed Analysis</h4>
                <p className="text-caption text-gray-600">Comprehensive breakdown of the AI detection results</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <div className="prose prose-sm max-w-none">
                  {data.ai_detection.explanation.split('\n').map((line: string, index: number) => (
                    <p key={index} className={`text-gray-700 leading-relaxed ${line.trim() ? 'mb-3' : 'mb-2'}`}>
                      {line.trim() || '\u00A0'}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 
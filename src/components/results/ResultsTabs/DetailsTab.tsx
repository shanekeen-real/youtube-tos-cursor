import React from 'react';
import { Globe, Target, Zap, AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import HighlightedTranscript from '@/components/HighlightedTranscript';
import { ScanData } from '../types';
import { getRiskBadgeVariant, severityOrder, isEnglish } from '../ResultsUtils';

interface DetailsTabProps {
  data: ScanData;
  canAccessAIDetection: boolean;
}

export default function DetailsTab({ data, canAccessAIDetection }: DetailsTabProps) {
  return (
    <div className="h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Content Analysis + Highlights + Analyzed Content */}
        <div className="flex flex-col gap-6">
          {/* Content Analysis Card */}
          {data.context_analysis && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-yellow-600" />
                </div>
                <h3 className="text-body font-semibold text-gray-800">Content Analysis</h3>
              </div>
              
              <div className="mb-4 min-h-[400px] lg:min-h-[600px] flex flex-col">
                {/* Highlighted transcript with risky sections */}
                <HighlightedTranscript 
                  content={data.analyzed_content || ''} 
                  riskyPhrases={data.risky_phrases || []}
                  riskyPhrasesByCategory={data.risky_phrases_by_category || {}}
                  policyCategories={data.policy_categories || {}}
                  contextAnalysis={data.context_analysis}
                  className="flex-1 min-h-[300px] lg:min-h-[500px] max-h-[700px] overflow-auto"
                />
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="risk" className="text-xs">
                  {data.context_analysis.content_type?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                <Badge variant="safe" className="text-xs">
                  {data.context_analysis.target_audience?.toUpperCase() || 'GENERAL'}
                </Badge>
                <Badge variant="yellow" className="text-xs">
                  MONETIZATION {data.context_analysis.monetization_impact || 0}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-caption text-gray-600">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  <span>Language: <span className="font-medium text-gray-800">{data.context_analysis.language_detected}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3" />
                  <span>Length: <span className="font-medium text-gray-800">{data.context_analysis.content_length} words</span></span>
                </div>
              </div>
              
              {/* Language Warning */}
              {data.context_analysis.language_detected && !isEnglish(data.context_analysis.language_detected) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Non-English Content Detected</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    This content appears to be in {data.context_analysis.language_detected}. For best results, please ensure the video has English subtitles enabled or try a different video with English content.
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
        
        {/* Right column: Policy Category Analysis + Metadata (desktop) */}
        <div className="flex flex-col gap-6">
          {/* Policy Category Analysis Table */}
          {data.policy_categories && Object.keys(data.policy_categories).length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-yellow-600" />
                </div>
                <h3 className="text-body font-semibold text-gray-800">Policy Category Analysis</h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto space-y-4">
                {Object.entries(data.policy_categories)
                  .sort((a, b) => {
                    if (b[1].risk_score !== a[1].risk_score) {
                      return b[1].risk_score - a[1].risk_score;
                    }
                    return (severityOrder[b[1].severity] || 0) - (severityOrder[a[1].severity] || 0);
                  })
                  .map(([cat, val]: any) => {
                    const isAIGeneratedContent = cat === 'AI_GENERATED_CONTENT';
                    const isLocked = isAIGeneratedContent && !canAccessAIDetection;
                    
                    return (
                      <div key={cat} className="relative">
                        <div className={isLocked ? 'filter blur-sm opacity-60 pointer-events-none select-none' : ''} aria-hidden={isLocked}>
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-body text-gray-800 truncate max-w-[60%]">
                                {cat.replace(/_/g, ' ').replace(/\b(\w+) \1\b/g, '$1')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-caption font-medium text-gray-700">{val.risk_score}%</span>
                                <Badge variant={getRiskBadgeVariant(val.severity)} className="text-xs">
                                  {val.severity} Risk
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="text-caption text-gray-500 mb-2">
                              Confidence: {val.confidence}%
                            </div>
                            
                            {val.violations && val.violations.length > 0 && (
                              <div className="text-caption text-risk mb-2">
                                {val.violations.join(', ')}
                              </div>
                            )}
                            
                            <div className="text-sm text-gray-800">
                              {val.explanation}
                            </div>
                          </div>
                        </div>
                        {isLocked && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <Lock className="w-6 h-6 text-gray-500 mb-1" />
                            <span className="text-xs text-gray-700 px-2 py-1 rounded text-center">
                              Upgrade to <Link href="/pricing" className="underline text-blue-600">Advanced</Link> to unlock AI Content Detection
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </Card>
          )}
          
          {/* Highlights Card (now in right column) */}
          {data.highlights && data.highlights.length > 0 && (
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <h3 className="text-body font-semibold text-gray-800">Top Risk Highlights</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {data.highlights.map((h, i) => (
                  <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="font-semibold text-yellow-800 mb-2">{h.category}</div>
                    <div className="grid grid-cols-3 gap-2 text-caption text-gray-600">
                      <div>Risk: <span className="font-medium">{h.risk}</span></div>
                      <div>Score: <span className="font-medium">{h.score}</span></div>
                      <div>Confidence: <span className="font-medium">{h.confidence}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        
        {/* Fallback: If no enhanced details, show flagged sections */}
        {!data.context_analysis && !data.policy_categories && (
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-risk/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-risk" />
              </div>
              <h3 className="text-body font-semibold text-gray-800">Flagged Sections</h3>
            </div>
            
            {data.flaggedSections && data.flaggedSections.length > 0 ? (
              <div className="space-y-4">
                {data.flaggedSections.map((section, index) => (
                  <div key={index} className="border border-risk/20 bg-risk/5 p-4 rounded-lg">
                    <h4 className="font-semibold text-risk mb-2">Flagged Section {index + 1}</h4>
                    <p className="text-gray-800">{section}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No specific sections were flagged in this analysis.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
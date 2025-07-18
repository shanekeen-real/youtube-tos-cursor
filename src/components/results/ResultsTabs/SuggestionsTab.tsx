import React from 'react';
import { Target, Lock } from 'lucide-react';
import Link from 'next/link';
import { ScanData } from '../types';
import { toArray } from '../ResultsUtils';

interface SuggestionsTabProps {
  data: ScanData;
  suggestionLimit: number;
}

export default function SuggestionsTab({ data, suggestionLimit }: SuggestionsTabProps) {
  const suggestions = toArray(data.suggestions);

  return (
    <div className="h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-safe/10 rounded-lg flex items-center justify-center">
          <Target className="w-4 h-4 text-safe" />
        </div>
        <h3 className="text-body font-semibold text-gray-800">Recommendations</h3>
      </div>
      
      {suggestions.length > 0 ? (
        <div className="space-y-4">
          {suggestions.map((suggestion, index) => {
            const isLocked = index >= suggestionLimit;
            return (
              <div key={index} className="relative">
                <div className={isLocked ? 'filter blur-sm opacity-60 pointer-events-none select-none' : ''} aria-hidden={isLocked}>
                  <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      Suggestion {index + 1}: {suggestion.title}
                    </h4>
                    <p className="text-gray-800 mb-2">{suggestion.text}</p>
                    <div className="flex items-center gap-4 text-caption text-gray-600">
                      <span>Priority: {suggestion.priority}</span>
                      <span>Impact: {suggestion.impact_score}</span>
                    </div>
                  </div>
                </div>
                {isLocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <Lock className="w-6 h-6 text-gray-500 mb-1" />
                    <span className="text-xs text-gray-700 px-2 py-1 rounded">
                      Upgrade to <Link href="/pricing" className="underline text-blue-600">Pro</Link> to see all suggestions
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Suggestions Available</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            No specific suggestions were generated for this content. This could mean your content is already well-optimized for monetization.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Target className="w-4 h-4" />
              <span className="font-medium">Why no suggestions?</span>
            </div>
            <p className="text-sm text-gray-600">
              Content that shows minimal risk or is already well-optimized may not generate specific suggestions. This is often a good sign for your monetization potential.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 
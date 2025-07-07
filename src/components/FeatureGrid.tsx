import React from 'react';
import Card from './Card';
import Badge from './Badge';
import { Check, X } from 'lucide-react';

interface Feature {
  label: string;
  checked?: boolean;
  muted?: boolean;
  link?: string;
}

export interface FeatureSet {
  title: string;
  features: Feature[];
  recommended?: boolean;
  badgeText?: string;
  badgeColor?: 'risk' | 'safe' | 'neutral' | 'yellow';
}

interface FeatureGridProps {
  sets: FeatureSet[];
}

export default function FeatureGrid({ sets }: FeatureGridProps) {
  return (
    <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
      {sets.map((set, i) => (
        <Card
          key={set.title}
          className={`flex flex-col items-start relative ${set.recommended ? 'border-2 border-yellow-500' : 'border-gray-200'}`}
        >
          <span className="text-title font-semibold mb-4 text-gray-900">{set.title}</span>
          {set.recommended && set.badgeText && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge variant={set.badgeColor || 'yellow'}>{set.badgeText}</Badge>
            </span>
          )}
          <ul className="text-body text-gray-700 space-y-2 mt-2">
            {set.features.map((f, j) => (
              <li key={j} className={`flex items-start ${f.muted ? 'text-gray-400' : 'text-gray-900'}`}>
                {f.checked && <Check className="text-safe mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />}
                {!f.checked && f.muted && <X className="text-gray-400 mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />}
                {f.link ? (
                  <a href={f.link} className="text-yellow-500 underline hover:text-yellow-600">
                    {f.label}
                  </a>
                ) : (
                  f.label
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
} 
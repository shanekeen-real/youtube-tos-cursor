import React from 'react';
import Card from './Card';
import Badge from './Badge';

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
  badgeColor?: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
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
          className={`flex flex-col items-start relative ${set.recommended ? 'border-2 border-blue-600 shadow-md' : 'border'}`}
        >
          <span className="font-bold text-lg mb-2 text-[#212121]">{set.title}</span>
          {set.recommended && set.badgeText && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge color={set.badgeColor || 'blue'}>{set.badgeText}</Badge>
            </span>
          )}
          <ul className="text-sm text-gray-700 space-y-1 mt-2">
            {set.features.map((f, j) => (
              <li key={j} className={f.muted ? 'text-gray-400' : 'text-[#212121]'}>
                {f.checked && <span className="mr-1">✓</span>}
                {!f.checked && f.muted && <span className="mr-1">×</span>}
                {f.link ? <a href={f.link} className="text-blue-600 underline">{f.label}</a> : f.label}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
} 
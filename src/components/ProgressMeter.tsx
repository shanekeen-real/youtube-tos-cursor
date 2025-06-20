import React from 'react';

interface ProgressMeterProps {
  value: number; // 0-100
  color?: 'red' | 'yellow' | 'green';
  label?: string;
}

const colorMap = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
};

export default function ProgressMeter({ value, color = 'red', label }: ProgressMeterProps) {
  return (
    <div className="w-full">
      {label && <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>}
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full transition-all duration-500 ${colorMap[color]}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
} 
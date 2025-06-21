import React from 'react';

interface BadgeProps {
  color?: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
  children: React.ReactNode;
  className?: string;
}

const colorMap = {
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-800',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-700',
};

export default function Badge({ color = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[color]} ${className}`}>
      {children}
    </span>
  );
} 
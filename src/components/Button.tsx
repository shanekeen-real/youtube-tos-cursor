import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'blue';
  children: React.ReactNode;
}

export default function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  let base = 'rounded-lg font-medium px-4 py-2 transition focus:outline-none focus:ring-2';
  let styles = '';
  switch (variant) {
    case 'primary':
      styles = 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-400';
      break;
    case 'secondary':
      styles = 'bg-gray-100 text-black border border-gray-300 hover:bg-gray-200 focus:ring-gray-300';
      break;
    case 'outlined':
      styles = 'bg-white text-black border border-gray-300 hover:bg-gray-50 focus:ring-gray-300';
      break;
    case 'blue':
      styles = 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400';
      break;
  }
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
} 
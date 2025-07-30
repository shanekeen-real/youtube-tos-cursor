import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

const logoMap = {
  sm: '/yellowdollar_blacklogo.svg',
  md: '/yellowdollar_blacklogo.svg',
  lg: '/yellowdollar_blacklogo.svg',
};

// Size mappings for the horizontal logo - increased to industry standards
const sizeMap = {
  sm: { width: 160, height: 42 }, // Increased from 120x32
  md: { width: 200, height: 52 }, // Increased from 150x40
  lg: { width: 240, height: 62 }, // Increased from 180x48
};

export default function Logo({ size = 'md', className = '', alt = 'Yellow Dollar logo' }: LogoProps) {
  const src = logoMap[size] || logoMap.md;
  const dimensions = sizeMap[size] || sizeMap.md;
  
  return (
    <img
      src={src}
      width={dimensions.width}
      height={dimensions.height}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
} 
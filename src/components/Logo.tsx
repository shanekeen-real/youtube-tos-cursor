import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'black' | 'white' | 'allwhite';
  className?: string;
  alt?: string;
}

const logoMap = {
  black: {
    sm: '/yellowdollar_blacklogo.svg',
    md: '/yellowdollar_blacklogo.svg',
    lg: '/yellowdollar_blacklogo.svg',
  },
  white: {
    sm: '/leftaligned_logo_white.svg',
    md: '/leftaligned_logo_white.svg',
    lg: '/leftaligned_logo_white.svg',
  },
  allwhite: {
    sm: '/leftaligned_logo_allwhite.svg',
    md: '/leftaligned_logo_allwhite.svg',
    lg: '/leftaligned_logo_allwhite.svg',
  },
};

// Size mappings for the horizontal logo - increased to industry standards
const sizeMap = {
  sm: { width: 160, height: 42 }, // Increased from 120x32
  md: { width: 200, height: 52 }, // Increased from 150x40
  lg: { width: 240, height: 62 }, // Increased from 180x48
};

export default function Logo({ size = 'md', variant = 'black', className = '', alt = 'Yellow Dollar logo' }: LogoProps) {
  const src = logoMap[variant][size] || logoMap[variant].md;
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
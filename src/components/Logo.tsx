import React from 'react';

interface LogoProps {
  size?: 32 | 40 | 64;
  className?: string;
  alt?: string;
}

const logoMap = {
  32: '/yellowstrokeborderLOGO-32x32.svg',
  40: '/yellowstrokeborderLOGO-40x40.svg',
  64: '/yellowstrokeborderLOGO-64x64.svg',
};

export default function Logo({ size = 32, className = '', alt = 'Yellow Dollar logo' }: LogoProps) {
  const src = logoMap[size] || logoMap[32];
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={className}
      draggable={false}
    />
  );
} 
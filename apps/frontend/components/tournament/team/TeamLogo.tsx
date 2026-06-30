"use client";

import React from 'react';
import Image from 'next/image';

interface TeamLogoProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
};

export function TeamLogo({ src, name, size = 'md', className = '' }: TeamLogoProps) {
  const dimension = sizeMap[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={dimension}
        height={dimension}
        className={`rounded-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  // Fallback: Show initial in colored circle
  const initial = name.charAt(0).toUpperCase();
  const colorIndex = name.length % 5;
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
  ];

  return (
    <div
      className={`
        rounded-full flex items-center justify-center
        ${colors[colorIndex]}
        text-white font-bold
        ${className}
      `}
      style={{
        width: dimension,
        height: dimension,
        fontSize: dimension * 0.4,
      }}
    >
      {initial}
    </div>
  );
}

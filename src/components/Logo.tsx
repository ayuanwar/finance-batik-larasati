import React from 'react';
import Image from 'next/image';

interface LogoProps {
  variant?: 'full' | 'monogram' | 'transparent-monogram' | 'transparent-full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  priority?: boolean;
}

const sizeMap = {
  xs: { width: 24, height: 24, className: 'w-6 h-6' },
  sm: { width: 36, height: 36, className: 'w-9 h-9' },
  md: { width: 48, height: 48, className: 'w-12 h-12' },
  lg: { width: 72, height: 72, className: 'w-[72px] h-[72px]' },
  xl: { width: 120, height: 120, className: 'w-[120px] h-[120px]' },
};

const fullSizeMap = {
  xs: { width: 80, height: 80, className: 'w-20 h-20' },
  sm: { width: 120, height: 120, className: 'w-28 h-28' },
  md: { width: 160, height: 160, className: 'w-40 h-40' },
  lg: { width: 220, height: 220, className: 'w-56 h-56' },
  xl: { width: 320, height: 320, className: 'w-80 h-80' },
};

export function Logo({
  variant = 'monogram',
  size = 'md',
  className = '',
  priority = false,
}: LogoProps) {
  const VERSION = 'd4af37_v3';
  let src = `/logo-monogram.png?v=${VERSION}`;
  let dim = sizeMap[size];

  if (variant === 'full') {
    src = `/logo.png?v=${VERSION}`;
    dim = fullSizeMap[size];
  } else if (variant === 'transparent-monogram') {
    src = `/logo-monogram-transparent.png?v=${VERSION}`;
    dim = sizeMap[size];
  } else if (variant === 'transparent-full') {
    src = `/logo-transparent.png?v=${VERSION}`;
    dim = fullSizeMap[size];
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${dim.className} ${className}`}
    >
      <Image
        src={src}
        alt="Logo CV Batik Larasati"
        width={dim.width}
        height={dim.height}
        priority={priority}
        unoptimized
        className="object-contain w-full h-full select-none"
      />
    </div>
  );
}

export default Logo;

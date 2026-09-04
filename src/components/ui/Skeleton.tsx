import React from 'react';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
}) => {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }[variant];

  const style: React.CSSProperties = {
    width,
    height,
  };

  return (
    <div
      className={`bg-surface-variant animate-pulse ${variantClasses} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export interface SkeletonCardProps {
  aspectRatio?: 'poster' | 'square' | 'video';
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  aspectRatio = 'poster',
  className = '',
}) => {
  const aspectClass = {
    poster: 'aspect-[2/3]',
    square: 'aspect-square',
    video: 'aspect-video',
  }[aspectRatio];

  return (
    <div className={`flex flex-col animate-pulse ${className}`} aria-hidden="true">
      <div className={`w-full ${aspectClass} rounded-md bg-surface-variant mb-sm border border-tertiary/10`} />
      <div className="h-4 bg-surface-variant rounded w-3/4 mb-xs" />
      <div className="h-3 bg-surface-variant rounded w-1/2" />
    </div>
  );
};

export interface SkeletonRowProps {
  className?: string;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ className = '' }) => {
  return (
    <div
      className={`flex items-center justify-between p-md rounded-lg bg-surface-variant/30 border border-tertiary/20 animate-pulse ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-md w-full">
        <div className="w-8 h-8 rounded bg-surface-variant shrink-0" />
        <div className="flex flex-col gap-xs w-2/3">
          <div className="h-4 bg-surface-variant rounded w-1/2" />
          <div className="h-3 bg-surface-variant rounded w-1/3" />
        </div>
      </div>
      <div className="w-12 h-6 bg-surface-variant rounded shrink-0" />
    </div>
  );
};

import React from 'react';
import { cn } from '../utils/cn';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantStyles = {
  default: 'bg-primary-600',
  success: 'bg-green-600',
  warning: 'bg-yellow-600',
  error: 'bg-red-600',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  variant = 'default',
  showLabel = false,
  className,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'w-full bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden',
          sizeStyles[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantStyles[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-text-tertiary">
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
    </div>
  );
};

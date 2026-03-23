import React from 'react';
import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  return (
    <svg
      className={cn('animate-spin text-current', sizeStyles[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// ProgressBar 也导出在这个文件中，因为一些组件从 Spinner/Spinner 导入
interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

const progressSizeStyles = {
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
          progressSizeStyles[size]
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

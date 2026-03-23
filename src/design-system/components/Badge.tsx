import React from 'react';
import { cn } from '../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
}

const variantStyles = {
  default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  primary: 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300',
  secondary: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  error: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

import React from 'react';
import { cn } from '../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const shadowStyles = {
  none: '',
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, padding = 'md', shadow = 'sm', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface border border-border rounded-lg',
          paddingStyles[padding],
          shadowStyles[shadow],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

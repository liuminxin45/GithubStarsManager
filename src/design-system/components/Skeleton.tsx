import React from 'react';
import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded',
        className
      )}
    />
  );
};

// RepositoryCardSkeleton - 仓库卡片骨架屏
export const RepositoryCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border border-border rounded-lg bg-surface">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
};

// ReleaseCardSkeleton - 发布卡片骨架屏
export const ReleaseCardSkeleton: React.FC = () => {
  return (
    <div className="p-4 border border-border rounded-lg bg-surface">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-3 w-full mt-3" />
    </div>
  );
};

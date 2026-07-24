import React from 'react';
import { cn } from '@/lib/utils';

export default function ShimmerSkeleton({ className }) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} />;
}
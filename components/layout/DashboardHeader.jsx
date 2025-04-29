import React from 'react';
import { cn } from '@/lib/utils';

export function DashboardHeader({
  heading,
  subheading,
  children,
  className,
  ...props
}) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)} {...props}>
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {subheading && <p className="text-gray-500 dark:text-gray-400">{subheading}</p>}
      </div>
      {children}
    </div>
  );
}

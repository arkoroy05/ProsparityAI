'use client';

import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';

export function MetricCard({ title, value, description, trend, trendValue, className }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline space-x-3">
          <span className="text-2xl font-bold text-white">{value}</span>
          {trend && trendValue && (
            <div className={cn(
              "flex items-center text-sm font-medium",
              trend === 'up' ? "text-emerald-500" : "text-red-500"
            )}>
              {trend === 'up' ? (
                <ArrowUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownIcon className="w-4 h-4 mr-1" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-400">{description}</p>
      </CardContent>
    </Card>
  );
}
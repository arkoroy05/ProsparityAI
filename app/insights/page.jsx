"use client";

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { InsightsTabs } from '@/components/insights/InsightsTabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { MetricCard } from '@/components/insights/MetricCard';
import { Skeleton } from '@/components/ui/skeleton';

function MetricSkeleton() {
  return (
    <div className="p-4 border border-gray-800 bg-gray-900/50 rounded-lg">
      <Skeleton className="h-8 w-[100px] mb-2" />
      <Skeleton className="h-6 w-[150px]" />
    </div>
  );
}

export default function InsightsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (dateRange?.from) {
          params.append('from', dateRange.from.toISOString());
        }
        if (dateRange?.to) {
          params.append('to', dateRange.to.toISOString());
        }

        const response = await fetch(`/api/insights?${params}`);
        if (!response.ok) throw new Error('Failed to fetch insights');
        
        const data = await response.json();
        setMetrics(data.metrics);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load insights. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [dateRange, toast]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <DashboardShell>
        <DashboardHeader 
          heading="AI Insights"
          subheading="Analytics and insights from your AI sales calls"
        >
          <DateRangePicker 
            onDateRangeChange={handleDateRangeChange} 
            className="bg-gray-900 text-white border-gray-800"
          />
        </DashboardHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Lead Quality"
                value={`${Math.round(metrics?.qualificationRate || 0)}%`}
                description="Percentage of qualified leads"
                trend={metrics?.qualificationRate > 50 ? 'up' : 'down'}
                trendValue={`${Math.abs(((metrics?.qualificationRate || 0) - 50)).toFixed(1)}%`}
                className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all"
              />
              <MetricCard
                title="Response Rate"
                value={`${Math.round(metrics?.responseRate || 0)}%`}
                description="Lead response rate in conversations"
                trend={metrics?.responseRate > 40 ? 'up' : 'down'}
                trendValue={`${Math.abs(((metrics?.responseRate || 0) - 40)).toFixed(1)}%`}
                className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all"
              />
              <MetricCard
                title="Avg. Call Duration"
                value={`${Math.floor((metrics?.averageDuration || 0) / 60)}m ${(metrics?.averageDuration || 0) % 60}s`}
                description="Average duration of AI calls"
                className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all"
              />
            </>
          )}
        </div>

        <div className="mt-6">
          <InsightsTabs 
            initialMetrics={metrics} 
            selectedDateRange={dateRange} 
          />
        </div>
      </DashboardShell>
    </div>
  );
}

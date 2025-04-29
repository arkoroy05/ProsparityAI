'use client';

import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[300px] w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  );
}

export function InsightsTabs({ initialMetrics, selectedDateRange }) {
  const [metrics, setMetrics] = useState(initialMetrics || {});
  const [loading, setLoading] = useState(!initialMetrics);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const params = new URLSearchParams();
        if (selectedDateRange?.from) {
          params.append('from', selectedDateRange.from.toISOString());
        }
        if (selectedDateRange?.to) {
          params.append('to', selectedDateRange.to.toISOString());
        }

        const response = await fetch(`/api/insights?${params}`);
        if (!response.ok) throw new Error('Failed to fetch insights');
        
        const data = await response.json();
        setMetrics(data.metrics);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load insights data');
        setLoading(false);
      }
    }

    if (selectedDateRange) {
      fetchMetrics();
    }
  }, [selectedDateRange]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const objectionData = Object.entries(metrics.objections || {}).map(([key, value]) => ({
    name: key,
    value: value
  }));

  const topicData = Object.entries(metrics.discussionTopics || {}).map(([key, value]) => ({
    name: key,
    value: value
  }));

  const sentimentData = [
    { name: 'Positive', value: metrics.sentiments?.positive || 0 },
    { name: 'Neutral', value: metrics.sentiments?.neutral || 0 },
    { name: 'Negative', value: metrics.sentiments?.negative || 0 }
  ];

  return (
    <Tabs defaultValue="insights" className="w-full">
      <TabsList className="bg-gray-900 border-gray-800">
        <TabsTrigger value="insights" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Key Insights
        </TabsTrigger>
        <TabsTrigger value="objections" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Objections
        </TabsTrigger>
        <TabsTrigger value="topics" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Topics
        </TabsTrigger>
        <TabsTrigger value="sentiment" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Sentiment
        </TabsTrigger>
      </TabsList>

      <TabsContent value="insights" className="mt-6">
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-white">Key Insights</CardTitle>
            <CardDescription className="text-gray-400">Prioritized insights from your sales conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.insightPriority?.map((insight, index) => (
                <div key={index} className="p-4 border border-gray-800 bg-gray-900/30 rounded-lg">
                  <h4 className="font-medium text-white mb-2">{insight.title}</h4>
                  <p className="text-sm text-gray-400">{insight.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="objections" className="mt-6">
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-white">Top Objections</CardTitle>
            <CardDescription className="text-gray-400">Common objections raised during calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] text-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={objectionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Bar dataKey="value" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="topics" className="mt-6">
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-white">Discussion Topics</CardTitle>
            <CardDescription className="text-gray-400">Most discussed topics during calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] text-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Bar dataKey="value" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sentiment" className="mt-6">
        <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
          <CardHeader>
            <CardTitle className="text-white">Sentiment Analysis</CardTitle>
            <CardDescription className="text-gray-400">Overall sentiment from conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] text-gray-400">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

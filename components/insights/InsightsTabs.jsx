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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

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
    async function fetchInsights() {
      try {
        setLoading(true);
        setError(null);

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
      } catch (err) {
        console.error('Error fetching insights:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [selectedDateRange]);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
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
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="objections">Objections</TabsTrigger>
        <TabsTrigger value="topics">Topics</TabsTrigger>
        <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Call Overview</CardTitle>
            <CardDescription>AI-generated insights from your sales calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics.insightPriority.map((insight, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">{insight.title}</h4>
                <p className="text-sm text-gray-600">{insight.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="objections">
        <Card>
          <CardHeader>
            <CardTitle>Top Objections</CardTitle>
            <CardDescription>Common objections raised during calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={objectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="topics">
        <Card>
          <CardHeader>
            <CardTitle>Discussion Topics</CardTitle>
            <CardDescription>Most discussed topics during calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sentiment">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis</CardTitle>
            <CardDescription>Overall sentiment from conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

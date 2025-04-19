'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { CallAnalytics } from '@/components/dashboard/CallAnalytics';
import { ScheduledCalls } from '@/components/calls/ScheduledCalls';
import { AIInstructions } from '@/components/ai/AIInstructions';
import { LeadManagement } from '@/components/leads/LeadManagement';
import { useUser } from '@/lib/hooks/use-user';

export default function DashboardPage() {
  const { user, company, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !company) {
    return null; // The useUser hook will handle redirection
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="calls">Calls</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="ai">AI Agent</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <CallAnalytics company={company} />
            </Card>
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Calls</h2>
              <ScheduledCalls company={company} />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="p-6">
              <CallAnalytics company={company} />
            </Card>
            <Card className="p-6">
              <ScheduledCalls company={company} />
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="space-y-6">
          <Card className="p-6">
            <LeadManagement company={company} />
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card className="p-6">
            <AIInstructions company={company} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 
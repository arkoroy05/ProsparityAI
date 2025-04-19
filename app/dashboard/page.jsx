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
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-lg text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !company) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Dashboard
          </h1>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="calls" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Calls
            </TabsTrigger>
            <TabsTrigger 
              value="leads" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Leads
            </TabsTrigger>
            <TabsTrigger 
              value="ai" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              AI Agent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">Recent Activity</h2>
                  <CallAnalytics company={company} />
                </div>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-pink-500/10 transition-all">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4 text-white">Upcoming Calls</h2>
                  <ScheduledCalls company={company} />
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
                <div className="p-6">
                  <CallAnalytics company={company} />
                </div>
              </Card>
              <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-pink-500/10 transition-all">
                <div className="p-6">
                  <ScheduledCalls company={company} />
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-purple-500/10 transition-all">
              <div className="p-6">
                <LeadManagement company={company} />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 shadow-lg hover:shadow-pink-500/10 transition-all">
              <div className="p-6">
                <AIInstructions company={company} />
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
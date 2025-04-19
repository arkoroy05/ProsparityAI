import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { CallInsights } from '@/components/calls/CallInsights';
import { toast } from 'sonner';
import { AICallService } from '@/lib/ai-call-service';
import { Loader2, TrendingUp, Users, PhoneCall, Activity } from 'lucide-react';

export function CallAnalytics({ company }) {
  const [calls, setCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    averageSentiment: 0,
    successRate: 0
  });

  useEffect(() => {
    if (company?.id) {
      fetchCallData();
    }
  }, [company]);

  async function fetchCallData() {
    if (!company?.id) {
      console.error('No company ID provided');
      toast.error('Company information is missing');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch recent calls
      const { data: recentCalls, error: callsError } = await supabase
        .from('call_logs')
        .select(`
          *,
          leads:lead_id (name, email, phone),
          companies:company_id (name)
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (callsError) {
        console.error('Error fetching recent calls:', callsError);
        throw new Error('Failed to fetch recent calls');
      }

      setCalls(recentCalls || []);

      // Fetch call statistics
      const { data: callStats, error: statsError } = await supabase
        .from('call_logs')
        .select('status, sentiment_score')
        .eq('company_id', company.id);

      if (statsError) {
        console.error('Error fetching call statistics:', statsError);
        throw new Error('Failed to fetch call statistics');
      }

      if (callStats && callStats.length > 0) {
        const totalCalls = callStats.length;
        const completedCalls = callStats.filter(call => call.status === 'completed').length;
        const averageSentiment = callStats.reduce((acc, call) => acc + (call.sentiment_score || 0), 0) / totalCalls;
        const successRate = (completedCalls / totalCalls) * 100;

        setStats({
          totalCalls,
          completedCalls,
          averageSentiment,
          successRate
        });
      } else {
        setStats({
          totalCalls: 0,
          completedCalls: 0,
          averageSentiment: 0,
          successRate: 0
        });
      }
    } catch (error) {
      console.error('Error in fetchCallData:', error);
      toast.error(error.message || 'Failed to load call data');
      setCalls([]);
      setStats({
        totalCalls: 0,
        completedCalls: 0,
        averageSentiment: 0,
        successRate: 0
      });
    } finally {
      setLoading(false);
    }
  }

  const handleMakeCall = async (lead) => {
    if (!lead?.phone) {
      toast.error('No phone number available for this lead');
      return;
    }

    try {
      const result = await AICallService.makeCall(lead.phone, lead, company);
      if (result.success) {
        toast.success('Call initiated successfully');
        fetchCallData(); // Refresh the call data
      } else {
        throw new Error(result.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error in handleMakeCall:', error);
      toast.error(error.message || 'Failed to initiate call');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${(stats.totalCalls * 100).toLocaleString()}</div>
            <p className="text-xs text-[#4ade80] mt-1">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalCalls.toLocaleString()}</div>
            <p className="text-xs text-[#4ade80] mt-1">+15% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.completedCalls.toLocaleString()}</div>
            <p className="text-xs text-[#4ade80] mt-1">+201 since last hour</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-[#4ade80] mt-1">+5.2% from last week</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calls.length === 0 ? (
                <p className="text-muted-foreground">No calls recorded yet</p>
              ) : (
                calls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 border border-[#2a2d35] rounded-lg cursor-pointer hover:bg-[#2a2d35] transition-colors"
                    onClick={() => setSelectedCall(call)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white">{call.leads?.name || 'Unknown Lead'}</div>
                        <div className="text-sm text-muted-foreground">
                          {call.companies?.name || 'Unknown Company'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            call.status === 'completed'
                              ? 'success'
                              : call.status === 'failed'
                              ? 'destructive'
                              : 'default'
                          }
                          className="bg-opacity-20"
                        >
                          {call.status}
                        </Badge>
                        {call.status !== 'completed' && call.leads?.phone && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="bg-[#2a2d35] hover:bg-[#353841] text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMakeCall(call.leads);
                            }}
                          >
                            Call Now
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {new Date(call.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Call Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCall ? (
              <CallInsights call={selectedCall} />
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a call to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
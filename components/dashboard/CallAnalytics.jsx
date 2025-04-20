import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { CallInsights } from '@/components/calls/CallInsights';
import { toast } from 'sonner';
import { AICallService } from '@/lib/ai-call-service';
import { Loader2, TrendingUp, Users, PhoneCall, Activity } from 'lucide-react';
import { Alert, AlertIcon } from '@/components/ui';
import { createClient } from '@/lib/supabase-browser';

export function CallAnalytics({ company }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      if (!company?.id) return;

      try {
        setLoading(true);
        setError(null);

        const { data: callLogs, error: callError } = await supabase
          .from('call_logs')
          .select('*')
          .eq('company_id', company.id);

        if (callError) throw callError;

        // Process the data safely
        const processedData = callLogs.map(log => {
          try {
            // If the data is a string, parse it
            const transcript = typeof log.transcript === 'string' 
              ? JSON.parse(log.transcript)
              : log.transcript;

            const analysis = typeof log.analysis === 'string'
              ? JSON.parse(log.analysis)
              : log.analysis;

            return {
              ...log,
              transcript,
              analysis
            };
          } catch (parseError) {
            console.error('Error parsing call log data:', parseError);
            return {
              ...log,
              transcript: null,
              analysis: null
            };
          }
        });

        setData(processedData);
      } catch (error) {
        console.error('Error fetching call analytics:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [company?.id]);

  const handleMakeCall = async (lead) => {
    if (!lead?.phone) {
      toast.error('No phone number available for this lead');
      return;
    }

    try {
      const result = await AICallService.makeCall(lead.phone, lead, company);
      if (result.success) {
        toast.success('Call initiated successfully');
        fetchData(); // Refresh the call data
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
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert status="error" variant="left-accent">
        <AlertIcon />
        Error loading call analytics: {error}
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Alert status="info" variant="left-accent">
        <AlertIcon />
        No call data available yet. Start making calls to see analytics here.
      </Alert>
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
            <div className="text-2xl font-bold text-white">${(data.length * 100).toLocaleString()}</div>
            <p className="text-xs text-[#4ade80] mt-1">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.length.toLocaleString()}</div>
            <p className="text-xs text-[#4ade80] mt-1">+15% from last month</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.filter(call => call.status === 'completed').length.toLocaleString()}</div>
            <p className="text-xs text-[#4ade80] mt-1">+201 since last hour</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1c23] border-[#2a2d35]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{((data.filter(call => call.status === 'completed').length / data.length) * 100).toFixed(1)}%</div>
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
              {data.length === 0 ? (
                <p className="text-muted-foreground">No calls recorded yet</p>
              ) : (
                data.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 border border-[#2a2d35] rounded-lg cursor-pointer hover:bg-[#2a2d35] transition-colors"
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
            {data.length > 0 && (
              <CallInsights call={data[0]} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
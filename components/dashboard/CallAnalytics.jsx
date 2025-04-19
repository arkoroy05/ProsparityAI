import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { CallInsights } from '@/components/calls/CallInsights';
import { toast } from 'sonner';
import { AICallService } from '@/lib/ai-call-service';

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
    if (company) {
      fetchCallData();
    }
  }, [company]);

  async function fetchCallData() {
    try {
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

      if (callsError) throw callsError;
      setCalls(recentCalls || []);

      // Fetch call statistics
      const { data: callStats, error: statsError } = await supabase
        .from('call_logs')
        .select('status, sentiment_score')
        .eq('company_id', company.id);

      if (statsError) throw statsError;

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
      }
    } catch (error) {
      console.error('Error fetching call data:', error);
      toast.error('Error loading call data');
    } finally {
      setLoading(false);
    }
  }

  const handleMakeCall = async (lead) => {
    try {
      const result = await AICallService.makeCall(lead.phone, lead, company);
      if (result.success) {
        toast.success('Call initiated successfully');
        fetchCallData(); // Refresh the call data
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error making call:', error);
      toast.error('Failed to initiate call');
    }
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCalls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageSentiment.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.successRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calls.length === 0 ? (
                <p className="text-gray-500">No calls recorded yet</p>
              ) : (
                calls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedCall(call)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{call.leads?.name}</div>
                        <div className="text-sm text-gray-500">
                          {call.companies?.name}
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
                        >
                          {call.status}
                        </Badge>
                        {call.status !== 'completed' && (
                          <Button
                            size="sm"
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
                    <div className="mt-2 text-sm text-gray-500">
                      {new Date(call.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Call Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCall ? (
              <CallInsights call={selectedCall} />
            ) : (
              <div className="text-center text-gray-500">
                Select a call to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
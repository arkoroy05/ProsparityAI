import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createSupabaseClient } from '@/lib/supabase-browser';
import { CallInsights } from '@/components/calls/CallInsights';
import { toast } from 'sonner';
import { AICallService } from '@/lib/ai-call-service';
import { Loader2, TrendingUp, Users, PhoneCall, Activity } from 'lucide-react';
import { Alert, AlertIcon } from '@/components/ui';

export function CallAnalytics({ company }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!company?.id) {
        setError('Company information is missing');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const supabase = createSupabaseClient();
        if (!supabase) {
          throw new Error('Failed to initialize Supabase client');
        }

        // First verify access to the company
        const { data: companyAccess, error: accessError } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('company_id', company.id)
          .single();

        if (accessError) {
          console.error('Company access verification failed:', accessError);
          throw new Error(`Access verification failed: ${accessError.message || 'Unknown error'}`);
        }

        if (!companyAccess) {
          throw new Error('You do not have access to this company\'s data');
        }

        // First get all tasks for this company
        const { data: companyTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .eq('company_id', company.id);

        if (tasksError) {
          console.error('Error fetching company tasks:', tasksError);
          throw new Error(`Failed to fetch company tasks: ${tasksError.message || 'Unknown error'}`);
        }

        if (!companyTasks || companyTasks.length === 0) {
          console.warn('No tasks found for company:', company.id);
          setData([]);
          return;
        }

        // Get task IDs
        const taskIds = companyTasks.map(task => task.id);

        // Now fetch call logs for these tasks
        const { data: callLogs, error: callError } = await supabase
          .from('call_logs')
          .select('*')
          .in('task_id', taskIds)
          .order('created_at', { ascending: false });

        if (callError) {
          console.error('Supabase query error:', JSON.stringify(callError, null, 2));
          throw new Error(`Failed to fetch call logs: ${callError.message || 'Unknown error'}`);
        }

        if (!callLogs || callLogs.length === 0) {
          console.warn('No call logs found for company tasks:', company.id);
          setData([]);
          return;
        }

        // Get all unique lead IDs
        const leadIds = [...new Set(callLogs.map(log => log.lead_id))].filter(Boolean);
        
        // Fetch related leads data if there are any lead IDs
        let leadsData = {};
        if (leadIds.length > 0) {
          const { data: leads, error: leadsError } = await supabase
            .from('leads')
            .select('id, name, phone, email')
            .in('id', leadIds);
            
          if (leadsError) {
            console.error('Error fetching leads:', leadsError);
          } else if (leads) {
            // Create a map of lead ID to lead data
            leadsData = leads.reduce((acc, lead) => {
              acc[lead.id] = lead;
              return acc;
            }, {});
          }
        }

        // Fetch the task details for each call log
        let tasksData = {};
        if (taskIds.length > 0) {
          const { data: tasks, error: taskDetailsError } = await supabase
            .from('tasks')
            .select('id, title, company_id')
            .in('id', taskIds);
            
          if (taskDetailsError) {
            console.error('Error fetching task details:', taskDetailsError);
          } else if (tasks) {
            // Create a map of task ID to task data
            tasksData = tasks.reduce((acc, task) => {
              acc[task.id] = task;
              return acc;
            }, {});
          }
        }

        // Enhance call logs with lead and task data
        const enhancedCallLogs = callLogs.map(log => ({
          ...log,
          leads: log.lead_id ? leadsData[log.lead_id] : null,
          tasks: log.task_id ? tasksData[log.task_id] : null,
          companies: { 
            id: log.task_id && tasksData[log.task_id] ? tasksData[log.task_id].company_id : company.id, 
            name: company.name 
          }
        }));

        // Process the data safely
        const processedData = enhancedCallLogs.map(log => {
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
            console.error('Error parsing call log data for log ID:', log.id, parseError);
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
        setError(error.message || 'An unexpected error occurred while fetching call data');
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
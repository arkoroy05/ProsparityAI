import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export function ScheduledCalls({ company }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledCalls();
  }, [company]);

  const fetchScheduledCalls = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_calls')
        .select(`
          *,
          leads (
            name,
            email,
            phone
          )
        `)
        .eq('company_id', company.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error fetching scheduled calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      scheduled: 'default',
      completed: 'success',
      cancelled: 'destructive',
      missed: 'warning'
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  if (loading) {
    return <div>Loading scheduled calls...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Calls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls.length === 0 ? (
            <p className="text-muted-foreground">No scheduled calls</p>
          ) : (
            calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{call.leads.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(call.scheduled_at), 'PPP p')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm">{call.leads.phone}</p>
                  {getStatusBadge(call.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
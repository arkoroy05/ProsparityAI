import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function ScheduleCall({ lead, company }) {
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSchedule = async () => {
    try {
      setLoading(true);
      const scheduledTime = new Date(date);
      const [hours, minutes] = time.split(':');
      scheduledTime.setHours(parseInt(hours), parseInt(minutes));

      const { error } = await supabase
        .from('scheduled_calls')
        .insert({
          lead_id: lead.id,
          company_id: company.id,
          scheduled_at: scheduledTime.toISOString(),
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success('Call scheduled successfully');
    } catch (error) {
      console.error('Error scheduling call:', error);
      toast.error('Failed to schedule call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Call</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <Button
            onClick={handleSchedule}
            disabled={loading || !time}
            className="w-full"
          >
            {loading ? 'Scheduling...' : 'Schedule Call'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 
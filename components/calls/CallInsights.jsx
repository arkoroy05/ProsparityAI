import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function CallInsights({ call }) {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (call) {
      fetchTranscript();
    }
  }, [call]);

  const fetchTranscript = async () => {
    try {
      if (!call || !call.id) {
        console.log('No call ID available');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('call_transcripts')
        .select('*')
        .eq('call_id', call.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is the error code for "Results contain 0 rows"
        throw error;
      }
      
      if (data) {
        setTranscript(data);
      } else {
        console.log('No transcript found for call:', call.id);
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);
      toast.error('Failed to load call transcript');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (score) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return <div>Loading call details...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium mb-1">Duration</h3>
          <p>{Math.round(call.duration / 60)} minutes</p>
        </div>
        <div>
          <h3 className="font-medium mb-1">Status</h3>
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
        </div>
        <div>
          <h3 className="font-medium mb-1">Sentiment</h3>
          <p className={getSentimentColor(call.sentiment_score)}>
            {(call.sentiment_score * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <h3 className="font-medium mb-1">Lead Response</h3>
          <p>{call.lead_response || 'No response recorded'}</p>
        </div>
      </div>

      {transcript && (
        <div>
          <h3 className="font-medium mb-2">Transcript</h3>
          <Card>
            <CardContent className="p-4 max-h-[400px] overflow-y-auto">
              {transcript.content.map((entry, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    entry.speaker === 'agent' ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <p className="font-medium mb-1">
                    {entry.speaker === 'agent' ? 'AI Agent' : 'Lead'}:
                  </p>
                  <p>{entry.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {call.recording_url && (
        <div>
          <h3 className="font-medium mb-2">Recording</h3>
          <audio controls className="w-full">
            <source src={call.recording_url} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {call.status === 'completed' && (
        <div className="space-y-2">
          <h3 className="font-medium">Next Steps</h3>
          <Button
            onClick={() => {
              // Handle follow-up scheduling
            }}
          >
            Schedule Follow-up
          </Button>
        </div>
      )}
    </div>
  );
} 
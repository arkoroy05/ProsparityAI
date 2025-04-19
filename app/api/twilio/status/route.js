import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    console.log('Twilio status callback:', Object.fromEntries(formData.entries()));
    
    // Extract call details
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const callDuration = formData.get('CallDuration');
    
    if (!callSid) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing CallSid' 
      }, { status: 400 });
    }
    
    // Update call log in database
    try {
      // First check if we have this call in our database
      const { data: existingCall, error: fetchError } = await supabase
        .from('call_logs')
        .select('id, task_id')
        .eq('call_sid', callSid)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching call log:', fetchError);
      }
      
      if (existingCall) {
        // Update existing call log
        const { error: updateError } = await supabase
          .from('call_logs')
          .update({
            status: callStatus,
            duration: callDuration ? parseInt(callDuration) : null,
            notes: {
              ...existingCall.notes,
              status_updates: [
                ...(existingCall.notes?.status_updates || []),
                {
                  status: callStatus,
                  timestamp: new Date().toISOString(),
                }
              ]
            }
          })
          .eq('call_sid', callSid);
        
        if (updateError) {
          console.error('Error updating call log:', updateError);
        }
        
        // If call is completed or failed, update the related task
        if (['completed', 'failed', 'busy', 'no-answer'].includes(callStatus) && existingCall.task_id) {
          const taskStatus = callStatus === 'completed' ? 'completed' : 'failed';
          
          const { error: taskUpdateError } = await supabase
            .from('tasks')
            .update({
              status: taskStatus,
              completed_at: new Date().toISOString(),
              metadata: {
                call_status: callStatus,
                call_duration: callDuration,
                call_sid: callSid
              }
            })
            .eq('id', existingCall.task_id);
          
          if (taskUpdateError) {
            console.error('Error updating task status:', taskUpdateError);
          }
        }
      } else {
        // This is a new call we haven't seen before
        console.log('Received status update for unknown call:', callSid);
      }
    } catch (dbError) {
      console.error('Database error in status callback:', dbError);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in Twilio status callback:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
} 
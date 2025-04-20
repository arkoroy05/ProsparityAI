import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Parse form data from request
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    
    // Fetch the call details from your database
    const { data: callLog } = await supabase
      .from('call_logs')
      .select('*')
      .eq('call_sid', callSid)
      .single();

    if (callLog) {
      // Use the generated script from the call log
      twiml.say({ voice: 'Polly.Amy' }, callLog.script);
      
      // Add a gather for user input if needed
      const params = [];
      if (callSid) {
        params.push(['callSid', callSid]);
      }

      const queryString = params
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      const gather = twiml.gather({
        input: 'speech',
        action: `/api/twilio/voice-handler/process-input?${queryString}`,
        language: 'en-US',
        speechTimeout: 'auto',
        enhanced: true
      });
      
      gather.say('Please tell me more about your needs.');
    } else {
      twiml.say('Sorry, I could not find the call details.');
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
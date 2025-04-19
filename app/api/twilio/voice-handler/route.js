import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(req) {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Get the call SID from the request
    const callSid = req.url.searchParams.get('CallSid');
    
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
      const gather = twiml.gather({
        input: 'speech',
        action: `/api/twilio/voice-handler/process-input?callSid=${callSid}`,
        method: 'POST'
      });
      
      gather.say('Please tell me more about your needs.');
    } else {
      twiml.say('Sorry, I could not find the call details.');
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error handling Twilio voice webhook:', error);
    return new NextResponse('Error processing request', { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';

export async function POST(req) {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Get form data from the request
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    const speechResult = formData.get('SpeechResult');
    
    console.log('Processing voice input:', {
      callSid,
      speechResult
    });
    
    if (!callSid) {
      console.error('No CallSid provided in request');
      twiml.say('Sorry, there was an error processing your input.');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }
    
    // Record the speech input in the database
    if (speechResult) {
      const { error: updateError } = await supabase
        .from('call_logs')
        .update({
          transcription: speechResult,
          updated_at: new Date().toISOString()
        })
        .eq('call_sid', callSid);
        
      if (updateError) {
        console.error('Error updating call log with transcription:', updateError);
      }
    }
    
    // Respond to the user with a simple confirmation
    twiml.say({ voice: 'Polly.Amy' }, 'Thank you for your input. Is there anything else you would like to discuss?');
    
    // Add another gather for additional input
    const gather = twiml.gather({
      input: 'speech',
      action: `/api/twilio/voice-handler/process-input?callSid=${callSid}`,
      method: 'POST',
      timeout: 5
    });
    
    // After waiting for input, end the call if no response
    twiml.say('Thank you for your time. Goodbye.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error handling Twilio speech input:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was an error processing your input.');
    twiml.hangup();
    return new NextResponse(twiml.toString(), { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  }
} 
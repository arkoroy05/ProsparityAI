import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';
import { AICallAgent } from '@/lib/ai-call-agent';

// Configure speech recognition settings
const gatherOptions = {
  input: 'speech dtmf',
  language: 'en-US',
  speechTimeout: 'auto',
  enhanced: true,
  method: 'POST',
  timeout: 15, // Increased timeout for better speech recognition
  speechModel: 'phone_call', // Optimized for phone calls
  profanityFilter: false, // Allow natural speech without filtering
};

export async function POST(req) {
  try {
    const twiml = new twilio.twiml.VoiceResponse();

    // Parse form data from request
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');

    console.log('Voice handler triggered:', {
      callSid,
      callStatus
    });

    // Fetch the call details from your database
    const { data: callLog, error: callLogError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('call_sid', callSid)
      .single();

    if (callLogError) {
      console.error('Error fetching call log:', callLogError);
      twiml.say({ voice: 'Polly.Amy' }, 'Sorry, I could not find your call details. Please try again later.');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    if (callLog) {
      // Try to create an AI agent for a more personalized greeting
      let greeting = callLog.script || 'Hello, I\'m calling from Prosparity.ai about our AI-powered sales platform.';

      if (callLog.lead_id && callLog.task_id) {
        try {
          const callAgent = new AICallAgent(callLog.lead_id, callLog.task_id);
          await callAgent.initialize();

          // Get a personalized greeting from the AI
          const leadName = callLog.lead_name || '';
          const aiGreeting = await callAgent.getInitialGreeting(leadName);

          if (aiGreeting) {
            greeting = aiGreeting;
          }
        } catch (error) {
          console.error('Error initializing AI agent for greeting:', error);
          // Continue with the default script from the call log
        }
      }

      // Use the greeting
      twiml.say({ voice: 'Polly.Amy' }, greeting);

      // Add a gather for user input
      const params = [];
      if (callSid) {
        params.push(['callSid', callSid]);
      }
      if (callLog.lead_id) {
        params.push(['leadId', callLog.lead_id]);
      }
      if (callLog.task_id) {
        params.push(['taskId', callLog.task_id]);
      }
      if (callLog.lead_name) {
        params.push(['leadName', callLog.lead_name]);
      }

      const queryString = params
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      const gather = twiml.gather({
        ...gatherOptions,
        action: `/api/twilio/voice-handler/process-input?${queryString}`,
      });

      gather.say({ voice: 'Polly.Amy' }, 'Please tell me more about your needs or ask any questions you might have.');
    } else {
      // No call log found, use a generic greeting
      twiml.say({ voice: 'Polly.Amy' }, 'Hello, I\'m calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?');

      const gather = twiml.gather({
        ...gatherOptions,
        action: `/api/twilio/voice-handler/process-input?callSid=${callSid}`,
      });

      gather.say({ voice: 'Polly.Amy' }, 'Please tell me more about your needs or ask any questions you might have.');
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
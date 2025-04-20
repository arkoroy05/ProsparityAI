import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';
import { AICallAgent, activeCallAgents } from '@/lib/ai-call-agent';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Initial greeting for the AI agent
const INITIAL_GREETING = "Hello, I'm Maya from Prosparity. I'm calling about improving your business processes. Do you have a moment to talk?";

// Maximum number of retries for no-input scenarios
const MAX_RETRIES = 2;

// Configure speech recognition settings
const gatherOptions = {
  input: 'speech',
  language: 'en-US',
  speechTimeout: 'auto',
  enhanced: true
};

// Helper function to check if we should end the conversation
function checkEndConversation(speechResult) {
  if (!speechResult) return false;
  
  const input = speechResult.toLowerCase();
  const endPhrases = [
    'goodbye', 'bye', 'end call', 'hang up', 
    'not interested', 'stop calling', 'do not call',
    'remove me', 'take me off', 'never call',
    'busy right now', 'call back later'
  ];
  
  return endPhrases.some(phrase => input.includes(phrase));
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const taskId = formData.get('taskId');
    const leadId = formData.get('leadId');
    const leadName = formData.get('leadName');
    const speechResult = formData.get('SpeechResult');
    const retryCount = parseInt(formData.get('retryCount') || '0', 10);
    const action = formData.get('action');
    
    console.log('Voice webhook triggered:', {
      callSid, callStatus, taskId, leadId, leadName,
      hasSpeech: !!speechResult,
      retryCount,
      action
    });

    const twiml = new VoiceResponse();

    // Get or create AI call agent for this call
    let callAgent = activeCallAgents[callSid];
    if (!callAgent && leadId && taskId) {
      callAgent = new AICallAgent(leadId, taskId);
      activeCallAgents[callSid] = callAgent;
    }

    if (action === 'retry') {
      if (retryCount >= MAX_RETRIES) {
        twiml.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, "I'm having trouble hearing you. Let me transfer you to a representative.");
        twiml.hangup();
      } else {
        // Build query string manually
        const params = [
          ['retryCount', (retryCount + 1).toString()],
          ['action', 'retry']
        ];
        if (taskId) params.push(['taskId', taskId]);
        if (leadId) params.push(['leadId', leadId]);
        if (leadName) params.push(['leadName', leadName]);

        const queryString = params
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');

        const gather = twiml.gather({
          ...gatherOptions,
          action: `/api/twilio/voice?${queryString}`
        });
        gather.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, "I'm sorry, I didn't catch that. Could you please respond?");
      }
    } else if (!speechResult) {
      // Initial greeting
      const gather = twiml.gather(gatherOptions);
      const greeting = leadName 
        ? `Hello ${leadName}, I'm Maya from Prosparity. I'm calling to discuss how our AI-powered sales solution might help improve your business processes. Do you have a moment to talk?`
        : INITIAL_GREETING;

      gather.say({ 
        voice: 'Polly.Amy',
        language: 'en-US' 
      }, greeting);

      // Add a backup redirect for no input
      const params = [];
      params.push(['action', 'retry']);
      if (taskId) params.push(['taskId', taskId]);
      if (leadId) params.push(['leadId', leadId]);
      if (leadName) params.push(['leadName', leadName]);

      const queryString = params
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      twiml.redirect(`/api/twilio/voice?${queryString}`);
    } else {
      // Process speech input and continue conversation
      const shouldEndCall = checkEndConversation(speechResult);
      
      if (shouldEndCall) {
        twiml.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, "Thank you for your time. Have a great day!");
        
        twiml.hangup();
        
        // Cleanup call agent
        if (callSid && activeCallAgents[callSid]) {
          delete activeCallAgents[callSid];
        }
      } else {
        const aiResponse = callAgent 
          ? await callAgent.processSpeech(speechResult)
          : "I apologize, but I'm having trouble accessing your information. Let me connect you with a human representative.";

        // Continue conversation
        const gather = twiml.gather(gatherOptions);
        gather.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, aiResponse);

        // Add a backup redirect for no input
        const params = [];
        params.push(['action', 'retry']);
        params.push(['lastResponse', aiResponse]);
        if (taskId) params.push(['taskId', taskId]);
        if (leadId) params.push(['leadId', leadId]);
        if (leadName) params.push(['leadName', leadName]);

        const queryString = params
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');

        twiml.redirect(`/api/twilio/voice?${queryString}`);
      }
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Amy',
      language: 'en-US'
    }, "I apologize, but I'm experiencing technical difficulties. Let me transfer you to a human representative.");
    
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

// Health check endpoint
export async function GET(request) {
  try {
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Amy',
      language: 'en-US'
    }, 'The Prosparity AI voice system is operational.');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error in health check:', error);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }
}
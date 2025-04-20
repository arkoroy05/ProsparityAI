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
      try {
        callAgent = new AICallAgent(leadId, taskId);
        activeCallAgents[callSid] = callAgent;
      } catch (error) {
        console.error('Error creating AI call agent:', error);
        // Don't immediately transfer to human, try to continue with basic functionality
      }
    }

    // Handle retry scenario
    if (action === 'retry') {
      if (retryCount >= MAX_RETRIES) {
        twiml.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, "I apologize, but I'm having trouble hearing you. Let me try to reach you at a better time. Have a great day!");
        twiml.hangup();
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      }

      // Get the last response from the agent if available
      let lastResponse = "I didn't catch that. Could you please repeat?";
      if (callAgent) {
        const retryResult = await callAgent.handleRetry();
        if (retryResult.shouldEnd) {
          twiml.say({
            voice: 'Polly.Amy',
            language: 'en-US'
          }, retryResult.message);
          twiml.hangup();
          return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
          });
        }
        lastResponse = retryResult.message;
      }

      const gather = twiml.gather(gatherOptions);
      gather.say({
        voice: 'Polly.Amy',
        language: 'en-US'
      }, lastResponse);

      // Add retry parameters to the redirect
      const params = [];
      params.push(['action', 'retry']);
      params.push(['retryCount', (retryCount + 1).toString()]);
      if (taskId) params.push(['taskId', taskId]);
      if (leadId) params.push(['leadId', leadId]);
      if (leadName) params.push(['leadName', leadName]);

      const queryString = params
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      twiml.redirect(`/api/twilio/voice?${queryString}`);
    }
    // Handle initial greeting or no speech input
    else if (!speechResult) {
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
    }
    // Process speech input and continue conversation
    else {
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
        let aiResponse;
        try {
          aiResponse = callAgent 
            ? await callAgent.processSpeech(speechResult)
            : "I understand you're interested in learning more. Let me tell you about how our AI-powered sales solution can help improve your business processes.";
        } catch (error) {
          console.error('Error processing speech:', error);
          aiResponse = "I understand you're interested in learning more. Let me tell you about how our AI-powered sales solution can help improve your business processes.";
        }

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
    
    // Try to recover from the error with a graceful message
    twiml.say({
      voice: 'Polly.Amy',
      language: 'en-US'
    }, "I apologize for the brief interruption. Let me continue with our conversation about how our AI-powered sales solution can help your business.");
    
    // Add a gather to continue the conversation
    const gather = twiml.gather(gatherOptions);
    gather.say({
      voice: 'Polly.Amy',
      language: 'en-US'
    }, "Could you tell me more about your current sales process?");
    
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
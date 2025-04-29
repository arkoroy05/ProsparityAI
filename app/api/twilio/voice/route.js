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
  input: 'speech dtmf',
  language: 'en-US',
  speechTimeout: 'auto',
  enhanced: true,
  action: '/api/twilio/voice',
  method: 'POST',
  finishOnKey: '#',
  numDigits: 1,
  timeout: 10,
  hints: [
    'yes', 'no', 'interested', 'not interested', 'busy', 'later',
    'price', 'cost', 'budget', 'demo', 'schedule', 'meeting',
    'more information', 'details', 'help', 'support', 'contact'
  ]
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

// Helper function to create gather with proper configuration
function createGather(twiml, message, additionalParams = {}) {
  const gather = twiml.gather({
    ...gatherOptions,
    ...additionalParams
  });
  
  gather.say({
    voice: 'Polly.Amy',
    language: 'en-US'
  }, message);
  
  return gather;
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
    const digits = formData.get('Digits');
    const retryCount = parseInt(formData.get('retryCount') || '0', 10);
    const action = formData.get('action');
    
    console.log('Voice webhook triggered:', {
      callSid, callStatus, taskId, leadId, leadName,
      hasSpeech: !!speechResult,
      hasDigits: !!digits,
      retryCount,
      action
    });

    const twiml = new VoiceResponse();

    // Get or create AI call agent for this call
    let callAgent = activeCallAgents[callSid];
    if (!callAgent && leadId && taskId) {
      console.log('Creating new AI call agent for:', { leadId, taskId });
      try {
        callAgent = new AICallAgent(leadId, taskId);
        await callAgent.initialize(); // Ensure agent is initialized
        activeCallAgents[callSid] = callAgent;
        console.log('AI call agent created and initialized');
      } catch (error) {
        console.error('Error creating AI call agent:', error);
      }
    }

    // Handle initial greeting or no speech input
    if (!speechResult && !digits) {
      console.log('Delivering initial greeting');
      const greeting = leadName 
        ? `Hello ${leadName}, I'm Maya from Prosparity. I'm calling to discuss how our AI-powered sales solution might help improve your business processes. Do you have a moment to talk?`
        : INITIAL_GREETING;

      createGather(twiml, greeting);

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Handle speech input
    if (speechResult) {
      console.log('Processing speech input:', speechResult);

      // Check if we should end the call
      const shouldEndCall = checkEndConversation(speechResult);
      if (shouldEndCall) {
        console.log('End conversation detected, hanging up');
        twiml.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, "Thank you for your time. Have a great day!");
        
        twiml.hangup();
        
        // Cleanup call agent
        if (callSid && activeCallAgents[callSid]) {
          console.log('Cleaning up call agent for:', callSid);
          delete activeCallAgents[callSid];
        }

        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      }

      // Process speech with AI agent
      let aiResponse;
      try {
        console.log('Generating AI response with call agent');
        aiResponse = callAgent 
          ? await callAgent.processSpeech(speechResult)
          : "I understand you're interested in learning more. Let me tell you about how our AI-powered sales solution can help improve your business processes.";
        
        console.log('AI response generated:', aiResponse);
      } catch (error) {
        console.error('Error processing speech:', error);
        aiResponse = "I apologize for the confusion. Let me connect you with one of our representatives who can better assist you.";
      }

      // Continue conversation with gather
      createGather(twiml, aiResponse, {
        action: `/api/twilio/voice?action=retry&retryCount=0`
      });

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Handle silence or no input
    console.log('Handling no input scenario, retry count:', retryCount);
    if (retryCount >= MAX_RETRIES) {
      console.log('Max retries reached, ending call');
      twiml.say({
        voice: 'Polly.Amy',
        language: 'en-US'
      }, "I apologize, but I'm having trouble hearing you. Let me try to reach you at a better time. Have a great day!");
      twiml.hangup();
      
      // Clean up call agent
      if (callSid && activeCallAgents[callSid]) {
        delete activeCallAgents[callSid];
      }
    } else {
      // Get the last response from the agent if available
      let retryMessage = "I'm sorry, I didn't catch that. Could you please repeat?";
      if (callAgent) {
        const retryResult = await callAgent.handleRetry();
        if (retryResult.shouldEnd) {
          twiml.say({
            voice: 'Polly.Amy',
            language: 'en-US'
          }, retryResult.message);
          twiml.hangup();
        } else {
          retryMessage = retryResult.message;
        }
      }

      createGather(twiml, retryMessage, {
        action: `/api/twilio/voice?action=retry&retryCount=${retryCount + 1}`
      });
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
    }, "I apologize for the technical difficulty. Let me have one of our representatives reach out to you.");
    
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
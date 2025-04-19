import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';
import { AICallAgent } from '@/lib/ai-call-agent';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Initial greeting for the AI agent
const INITIAL_GREETING = "Hello, this is an AI assistant from Prosparity. I'm calling to discuss how our services might help your business. Do you have a moment to talk?";

// Store active call agents
const activeCallAgents = {};

// This endpoint serves as the callback URL for Twilio when an outbound call connects
export async function POST(request) {
  try {
    const formData = await request.formData();
    console.log('Twilio voice callback triggered:', Object.fromEntries(formData.entries()));
    
    // Extract parameters from the request
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus');
    const taskId = formData.get('taskId');
    const leadId = formData.get('leadId');
    const leadName = formData.get('leadName');
    const speechResult = formData.get('SpeechResult');
    
    // Log the call details
    console.log('Outbound call details:', {
      callSid,
      callStatus,
      speechResult,
      taskId,
      leadId,
      leadName
    });

    // Get or create AI call agent for this call
    let callAgent = activeCallAgents[callSid];
    if (!callAgent && leadId && taskId) {
      callAgent = new AICallAgent(leadId, taskId);
      activeCallAgents[callSid] = callAgent;
    }
    
    // Record call details in the database
    if (callSid && taskId) {
      try {
        const { error: logError } = await supabase
          .from('call_logs')
          .upsert([{
            call_sid: callSid,
            task_id: taskId,
            lead_id: leadId,
            status: callStatus || 'in-progress',
            notes: {
              timestamp: new Date().toISOString(),
              speechResult: speechResult || null,
              isOutbound: true
            }
          }]);

        if (logError) {
          console.error('Error updating call log:', logError);
        }
      } catch (dbError) {
        console.error('Error recording call details:', dbError);
      }
    }

    // Generate TwiML response based on call state
    const twiml = new VoiceResponse();
    
    try {
      // If this is the initial outbound call connection (no speech result yet)
      if (!speechResult) {
        console.log('Initial outbound call connected - delivering greeting');
        
        // Use <Gather> to collect user speech input after greeting
        const gather = twiml.gather({
          input: 'speech',
          speechTimeout: 'auto',
          action: '/api/twilio/voice',
          method: 'POST',
          speechModel: 'phone_call',
          enhanced: true,
          language: 'en-US'
        });
        
        // Customize greeting if we have lead information
        const greeting = leadName 
          ? `Hello ${leadName}, this is an AI assistant from Prosparity. I'm calling to discuss how our services might help your business. Do you have a moment to talk?` 
          : INITIAL_GREETING;
          
        gather.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, greeting);
        
        // If no input is received, retry with a prompt
        twiml.redirect({
          method: 'POST'
        }, '/api/twilio/voice?action=retry');
      }
      // If we received speech input (conversation in progress)
      else {
        console.log('Processing lead response:', speechResult);
        
        let aiResponse;
        
        // Use the AI Call Agent if available, otherwise fallback to basic response
        if (callAgent) {
          aiResponse = await callAgent.processSpeech(speechResult);
          callAgent.trackAIResponse(aiResponse);
        } else {
          // Fallback to basic response generation
          aiResponse = generateAIResponse(speechResult, leadName);
        }
        
        // Check if the conversation should end
        const shouldEndCall = checkEndConversation(speechResult);
        
        if (shouldEndCall) {
          twiml.say({
            voice: 'Polly.Matthew',
            language: 'en-US'
          }, "Thank you for your time. Have a great day!");
          
          twiml.hangup();
          
          // Cleanup call agent
          if (callSid && activeCallAgents[callSid]) {
            delete activeCallAgents[callSid];
          }
        } else {
          // Continue the conversation
          const gather = twiml.gather({
            input: 'speech',
            speechTimeout: 'auto',
            action: '/api/twilio/voice',
            method: 'POST',
            speechModel: 'phone_call',
            enhanced: true,
            language: 'en-US'
          });
          
          gather.say({
            voice: 'Polly.Matthew',
            language: 'en-US'
          }, aiResponse);
          
          // If no input is received, follow up
          twiml.redirect({
            method: 'POST'
          }, '/api/twilio/voice?action=followup');
        }
      }
      
      // Log the generated TwiML
      console.log('Generated TwiML for outbound call:', twiml.toString());
      
      // Return the TwiML response
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    } catch (error) {
      console.error('Error generating TwiML for outbound call:', error);
      
      // Return a simple TwiML response in case of error
      twiml.say('We are experiencing technical difficulties. Please try again later.');
      twiml.hangup();
      
      return new NextResponse(twiml.toString(), {
        headers: {
          'Content-Type': 'text/xml'
        }
      });
    }
  } catch (error) {
    console.error('Error in outbound call handler:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

// For handling Twilio validation and providing a default response
export async function GET(request) {
  try {
    console.log('GET request to voice handler - Twilio validation');
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'The Prosparity AI outbound calling system is operational.');
    
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml'
      }
    });
  } catch (error) {
    console.error('Error in GET voice handler:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}

// Simple function to determine if we should end the call
function checkEndConversation(speechResult) {
  if (!speechResult) return false;
  
  const endPhrases = [
    'goodbye', 'bye', 'end call', 'hang up', 'stop',
    'not interested', 'don\'t call', 'do not call'
  ];
  
  return endPhrases.some(phrase => 
    speechResult.toLowerCase().includes(phrase)
  );
}

// Prototype AI response generation based on customer input
function generateAIResponse(speechResult, leadName) {
  // This would ideally call your AI service to generate a real-time response
  const input = speechResult.toLowerCase();
  const greeting = leadName ? `${leadName}` : 'there';
  
  // Detect interest level
  if (input.includes('not interested') || input.includes('no thanks') || input.includes('busy')) {
    return `I understand, ${greeting}. Thank you for your time. Would it be better if I call back at a more convenient time?`;
  }
  
  // Detect questions about the product
  if (input.includes('what do you offer') || input.includes('tell me more') || input.includes('how does it work')) {
    return `Our AI sales assistant helps businesses qualify leads, automate outreach, and gather insights. It can make calls like this one, follow up with leads, and provide analytics on customer interactions. What challenges is your sales team currently facing?`;
  }
  
  // Detect pricing questions
  if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
    return `Our pricing starts at $99 per month for the basic package, which includes AI call automation and lead qualification. For larger teams, we offer custom enterprise solutions. What size is your sales team?`;
  }
  
  // Detect positive interest
  if (input.includes('sounds good') || input.includes('interested') || input.includes('tell me more')) {
    return `Great to hear you're interested! Based on your business needs, our AI assistant can help streamline your sales process, qualify leads faster, and free up your team for higher-value activities. Would you like to schedule a demo with one of our specialists?`;
  }
  
  // Default response for continuing the conversation
  return `Thanks for sharing that information. Our AI assistant is designed to help businesses like yours improve sales efficiency. Could you tell me more about your current sales process so I can explain how we might help?`;
} 
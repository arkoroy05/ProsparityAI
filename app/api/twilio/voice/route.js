import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';
import { AICallAgent, activeCallAgents } from '@/lib/ai-call-agent';

const VoiceResponse = twilio.twiml.VoiceResponse;

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

// Helper function to save conversation transcript
async function saveCallTranscript(callSid, leadId, taskId, conversationHistory) {
  try {
    if (!callSid || !leadId) return;

    // Format transcript for storage
    const transcript = conversationHistory.map(msg => 
      `${msg.role.toUpperCase()} [${new Date(msg.timestamp).toLocaleTimeString()}]: ${msg.text}`
    ).join('\n\n');

    // Check if call log exists
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('id, metadata')
      .eq('call_sid', callSid)
      .single();

    if (existingLog) {
      // Update existing log
      await supabase
        .from('call_logs')
        .update({
          metadata: {
            ...(existingLog.metadata || {}),
            transcript: transcript,
            conversation_history: conversationHistory
          }
        })
        .eq('id', existingLog.id);
    } else {
      // Create new log
      await supabase
        .from('call_logs')
        .insert({
          call_sid: callSid,
          lead_id: leadId,
          task_id: taskId,
          status: 'in-progress',
          metadata: {
            transcript: transcript,
            conversation_history: conversationHistory
          }
        });
    }
  } catch (error) {
    console.error('Error saving call transcript:', error);
  }
}

// Helper function to generate and save call insights
async function generateCallInsights(callSid, leadId, conversationHistory) {
  try {
    if (!callSid || !leadId || !conversationHistory || conversationHistory.length < 2) return;

    // Get the AI agent for this call
    const callAgent = activeCallAgents[callSid];
    if (!callAgent) return;
    
    // Generate insights
    const insights = await callAgent.generateInsights(conversationHistory);
    
    // Save insights to call log
    const { data: existingLog } = await supabase
      .from('call_logs')
      .select('id, metadata')
      .eq('call_sid', callSid)
      .single();
      
    if (existingLog) {
      await supabase
        .from('call_logs')
        .update({
          metadata: {
            ...(existingLog.metadata || {}),
            insights: insights
          }
        })
        .eq('id', existingLog.id);
    }
    
    // Update lead with insights
    if (insights.leadClassification) {
      await supabase
        .from('leads')
        .update({
          metadata: {
            classification: insights.leadClassification,
            lastCallInsights: insights
          }
        })
        .eq('id', leadId);
    }
    
    return insights;
  } catch (error) {
    console.error('Error generating call insights:', error);
    return null;
  }
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

    // If this is the first webhook for the call, these params might be in the URL
    if (!taskId || !leadId) {
      const url = new URL(request.url);
      const urlTaskId = url.searchParams.get('taskId');
      const urlLeadId = url.searchParams.get('leadId');
      const urlLeadName = url.searchParams.get('leadName');
      
      if (urlTaskId) formData.set('taskId', urlTaskId);
      if (urlLeadId) formData.set('leadId', urlLeadId);
      if (urlLeadName) formData.set('leadName', urlLeadName);
    }
    
    console.log('Voice webhook triggered:', {
      callSid, callStatus, taskId, leadId, leadName,
      hasSpeech: !!speechResult,
      hasDigits: !!digits,
      retryCount,
      action
    });

    // Create new TwiML response
    const twiml = new VoiceResponse();

    // Handle call ending
    if (callStatus === 'completed' || callStatus === 'failed') {
      if (callAgent) {
        await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
        await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
        delete activeCallAgents[callSid];
      }
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Get or create AI call agent
    let callAgent = activeCallAgents[callSid];
    if (!callAgent) {
      // Only create agent if we have the required parameters
      if (leadId && taskId) {
        console.log('Creating new AI call agent for:', { leadId, taskId });
        try {
          callAgent = new AICallAgent(leadId, taskId);
          await callAgent.initialize();
          if (!callAgent.isInitialized) {
            throw new Error('AI agent failed to initialize properly');
          }
          activeCallAgents[callSid] = callAgent;
          console.log('AI call agent created and initialized successfully');
        } catch (error) {
          console.error('Error creating AI call agent:', error);
          // Use fallback instead of throwing
          const fallbackMessage = "I apologize, but I'm having trouble connecting. Let me have a representative call you back.";
          twiml.say({
            voice: 'Polly.Amy',
            language: 'en-US'
          }, fallbackMessage);
          twiml.hangup();
          return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
          });
        }
      }
    }

    // Initial greeting for new calls or when no input received yet
    if (!speechResult && !digits) {
      try {
        let greeting;
        if (callAgent) {
          greeting = await callAgent.getInitialGreeting(leadName);
        }
        
        // Use fallback greeting if AI fails
        if (!greeting) {
          greeting = leadName 
            ? `Hello ${leadName}, I'm calling from Prosparity about improving your business processes. Do you have a moment to talk?`
            : `Hello, I'm calling from Prosparity about improving your business processes. Do you have a moment to talk?`;
        }

        console.log('Using greeting:', greeting);
        
        // Create gather with greeting
        createGather(twiml, greeting, {
          action: `/api/twilio/voice?retryCount=0&taskId=${taskId}&leadId=${leadId}&leadName=${leadName || ''}`
        });
        
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      } catch (error) {
        console.error('Error in initial greeting:', error);
        // Use generic greeting as absolute fallback
        const fallbackGreeting = leadName 
          ? `Hello ${leadName}, I'm calling from Prosparity about improving your business processes. Do you have a moment to talk?`
          : `Hello, I'm calling from Prosparity about improving your business processes. Do you have a moment to talk?`;
          
        createGather(twiml, fallbackGreeting, {
          action: `/api/twilio/voice?retryCount=0&taskId=${taskId}&leadId=${leadId}&leadName=${leadName || ''}`
        });
        
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      }
    }

    // Handle user input
    if (speechResult || digits) {
      try {
        if (!callAgent) {
          throw new Error('No AI agent available for call');
        }

        // Process the input through AI agent
        const userInput = speechResult || digits;
        console.log('Processing user input:', userInput);
        
        // Check for conversation end signals
        if (checkEndConversation(userInput)) {
          // Generate final insights before ending
          await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
          await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
          
          // Say goodbye
          twiml.say({
            voice: 'Polly.Amy',
            language: 'en-US'
          }, 'Thank you for your time. Have a great day!');
          
          // Clean up
          delete activeCallAgents[callSid];
          
          return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
          });
        }

        // Get AI response
        const aiResponse = await callAgent.processSpeech(userInput);
        if (!aiResponse) {
          throw new Error('Failed to get AI response');
        }

        console.log('Generated AI response:', aiResponse);
        
        // Create gather with AI response
        createGather(twiml, aiResponse, {
          action: `/api/twilio/voice?retryCount=0`
        });
        
        // Save conversation progress
        await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
        
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      } catch (error) {
        console.error('Error processing user input:', error);
        // Fallback response
        const fallbackResponse = "I apologize, but I'm having trouble understanding. Could you please repeat that?";
        
        createGather(twiml, fallbackResponse, {
          action: `/api/twilio/voice?retryCount=${retryCount + 1}`
        });
        
        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      }
    }

    // Handle no input after timeout
    if (retryCount >= MAX_RETRIES) {
      twiml.say({
        voice: 'Polly.Amy',
        language: 'en-US'
      }, "I haven't heard from you. I'll try calling back at a better time. Have a great day!");
      
      if (callAgent) {
        // Save conversation state
        await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
        await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
        delete activeCallAgents[callSid];
      }
      
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Prompt for input again
    createGather(twiml, "I didn't catch that. Could you please respond?", {
      action: `/api/twilio/voice?retryCount=${retryCount + 1}`
    });
    
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
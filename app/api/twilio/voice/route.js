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

    // Handle call ending or hangup
    if (callStatus === 'completed') {
      console.log('Call completed, generating final insights');
      if (callAgent) {
        // Generate insights at the end of the call
        await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
        // Save final transcript
        await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
        // Clean up agent
        delete activeCallAgents[callSid];
      }
      return new NextResponse('Call completed', { status: 200 });
    }

    // Handle initial greeting or no speech input
    if (!speechResult && !digits && !action) {
      console.log('Delivering initial greeting');
      
      let greeting;
      if (callAgent) {
        // Get personalized greeting from AI agent
        greeting = await callAgent.getInitialGreeting(leadName);
      } else {
        // Fallback greeting if no agent
        greeting = leadName 
          ? `Hello ${leadName}, I'm calling from Prosparity. I'm calling to discuss how our AI-powered sales solution might help improve your business processes. Do you have a moment to talk?`
          : `Hello, I'm calling from Prosparity. I'm calling about improving your business processes. Do you have a moment to talk?`;
      }

      // Track AI message in conversation history
      if (callAgent) {
        callAgent.trackAIResponse(greeting);
        // Save initial greeting to transcript
        await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
      }

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
        const endMessage = "Thank you for your time. Have a great day!";
        
        twiml.say({
          voice: 'Polly.Amy',
          language: 'en-US'
        }, endMessage);
        
        twiml.hangup();
        
        // Add final response to conversation history
        if (callAgent) {
          callAgent.conversationHistory.push({
            role: 'lead',
            text: speechResult,
            timestamp: new Date().toISOString()
          });
          
          callAgent.trackAIResponse(endMessage);
          
          // Generate insights at the end of the call
          await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
          
          // Save final transcript
          await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
          
          // Cleanup call agent
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
        if (callAgent) {
          // Add user's speech to conversation history
          if (!callAgent.conversationHistory.some(entry => 
              entry.role === 'lead' && entry.text === speechResult)) {
            callAgent.conversationHistory.push({
              role: 'lead',
              text: speechResult,
              timestamp: new Date().toISOString()
            });
          }
          
          // Get AI response
          aiResponse = await callAgent.processSpeech(speechResult);
          
          // Save ongoing conversation transcript
          await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
        } else {
          aiResponse = "I understand you're interested in learning more. Let me tell you about how our AI-powered sales solution can help improve your business processes.";
        }
        
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
      const endMessage = "I apologize, but I'm having trouble hearing you. Let me try to reach you at a better time. Have a great day!";
      
      twiml.say({
        voice: 'Polly.Amy',
        language: 'en-US'
      }, endMessage);
      
      twiml.hangup();
      
      // Add final message to conversation history
      if (callAgent) {
        callAgent.trackAIResponse(endMessage);
        
        // Generate insights at the end of the call
        await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
        
        // Save final transcript
        await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
      }
      
      // Clean up call agent
      if (callSid && activeCallAgents[callSid]) {
        delete activeCallAgents[callSid];
      }
    } else {
      // Get the last response from the agent if available
      let retryMessage = "I'm sorry, I didn't catch that. Could you please repeat?";
      if (callAgent) {
        const retryResult = await callAgent.handleRetry();
        if (retryResult?.shouldEnd) {
          // Call should end
          twiml.say({
            voice: 'Polly.Amy',
            language: 'en-US'
          }, retryResult.message);
          
          // Add final message to conversation history
          callAgent.trackAIResponse(retryResult.message);
          
          // Generate insights at the end of the call
          await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
          
          // Save final transcript
          await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
          
          twiml.hangup();
          
          // Cleanup agent
          delete activeCallAgents[callSid];
        } else {
          retryMessage = retryResult?.message || retryMessage;
          
          // Add retry message to conversation history
          callAgent.trackAIResponse(retryMessage);
          
          // Save ongoing conversation transcript
          await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
          
          createGather(twiml, retryMessage, {
            action: `/api/twilio/voice?action=retry&retryCount=${retryCount + 1}`
          });
        }
      } else {
        createGather(twiml, retryMessage, {
          action: `/api/twilio/voice?action=retry&retryCount=${retryCount + 1}`
        });
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
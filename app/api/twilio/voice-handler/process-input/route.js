import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';
import { AICallAgent } from '@/lib/ai-call-agent';
import geminiAI from '@/lib/gemini-ai';

// Store active call agents in memory for this handler
const activeCallAgents = {};

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

    // Get form data from the request
    const formData = await req.formData();
    const callSid = formData.get('CallSid');
    const speechResult = formData.get('SpeechResult');
    const digits = formData.get('Digits');

    // Get URL parameters
    const url = new URL(req.url);
    const retryCount = parseInt(url.searchParams.get('retryCount') || '0', 10);

    console.log('Processing voice input:', {
      callSid,
      speechResult,
      digits,
      retryCount
    });

    if (!callSid) {
      console.error('No CallSid provided in request');
      twiml.say({ voice: 'Polly.Amy' }, 'Sorry, there was an error processing your input.');
      twiml.hangup();
      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // Get call details from database
    const { data: callLog, error: callLogError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('call_sid', callSid)
      .single();

    if (callLogError || !callLog) {
      console.error('Error fetching call log:', callLogError);
      twiml.say({ voice: 'Polly.Amy' }, 'Sorry, I could not find your call details.');
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

    // Get or create AI call agent
    let callAgent = activeCallAgents[callSid];
    if (!callAgent && callLog.lead_id) {
      try {
        console.log('Creating new AI call agent for:', { leadId: callLog.lead_id, taskId: callLog.task_id });
        callAgent = new AICallAgent(callLog.lead_id, callLog.task_id);
        await callAgent.initialize();
        activeCallAgents[callSid] = callAgent;
        console.log('AI call agent created and initialized successfully');
      } catch (error) {
        console.error('Error creating AI call agent:', error);
      }
    }

    // Generate AI response
    let aiResponse = 'Thank you for your input. Is there anything else you would like to discuss?';

    if (callAgent && (speechResult || digits)) {
      try {
        const userInput = speechResult || digits;
        console.log('Processing user input with AI agent:', userInput);

        // Try up to 3 times to get a valid response
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Attempt ${attempt + 1} to get AI response...`);
            const response = await callAgent.processSpeech(userInput);

            if (response) {
              aiResponse = response;
              console.log(`Successfully generated AI response on attempt ${attempt + 1}:`, aiResponse);
              break; // Exit loop if we got a valid response
            } else {
              console.warn(`Empty response on attempt ${attempt + 1}`);
            }
          } catch (responseError) {
            console.error(`AI response attempt ${attempt + 1} failed:`, responseError);

            // Only wait between retries, not after the last one
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } catch (error) {
        console.error('Error processing speech with AI agent:', error);
      }
    } else if (!callAgent) {
      // If no AI agent, use geminiAI directly
      try {
        if (speechResult) {
          const prompt = `
          You are a professional sales agent for Prosparity.ai, a company that offers AI-powered sales solutions.
          A potential customer has just said: "${speechResult}"

          Respond naturally as if in a real phone conversation. Keep your response brief, friendly, and focused on helping the customer.
          `;

          const response = await geminiAI.generateResponse(prompt);
          if (response) {
            aiResponse = response;
          }
        }
      } catch (error) {
        console.error('Error generating response with geminiAI:', error);
      }
    }

    // Respond to the user with the AI-generated response
    twiml.say({ voice: 'Polly.Amy' }, aiResponse);

    // Add another gather for additional input
    const gather = twiml.gather({
      ...gatherOptions,
      action: `/api/twilio/voice-handler/process-input?callSid=${callSid}&retryCount=0`,
    });

    gather.say({ voice: 'Polly.Amy' }, 'Please go ahead with any questions or comments.');

    // After waiting for input, provide a closing message if no response
    twiml.say({ voice: 'Polly.Amy' }, 'Thank you for your time. If you need anything else, please call back. Goodbye.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (error) {
    console.error('Error handling Twilio speech input:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Amy' }, 'Sorry, there was an error processing your input. Please try again later.');
    twiml.hangup();
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
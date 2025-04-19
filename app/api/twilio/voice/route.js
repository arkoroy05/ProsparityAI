import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const speechResult = formData.get('SpeechResult');

    // Fetch call details from database
    const { data: callLog } = await supabase
      .from('call_logs')
      .select(`
        *,
        leads:lead_id (*),
        companies:company_id (*),
        company_settings:companies(company_settings(*))
      `)
      .eq('call_sid', callSid)
      .single();

    if (!callLog) {
      throw new Error('Call log not found');
    }

    const twiml = new twilio.twiml.VoiceResponse();

    // If this is the start of the call
    if (!speechResult) {
      // Get AI instructions for the company
      const aiInstructions = callLog.companies.company_settings?.ai_instructions || '';

      // Generate initial greeting
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `You are an AI sales agent. ${aiInstructions}
        
        Generate a natural greeting for a sales call with the following lead:
        Name: ${callLog.leads.name}
        Company: ${callLog.companies.name}
        
        Keep it brief and conversational. Don't ask more than one question.`;

      const result = await model.generateContent(prompt);
      const greeting = result.response.text();

      // Start the call
      twiml.say({ voice: 'Polly.Amy' }, greeting);
      
      // Listen for the response
      twiml.gather({
        input: 'speech',
        action: '/api/twilio/voice',
        method: 'POST',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
      });
    } else {
      // Process the lead's response
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `You are an AI sales agent. ${callLog.companies.company_settings?.ai_instructions || ''}
        
        Previous conversation:
        ${JSON.stringify(callLog.notes || [])}
        
        Lead's response: "${speechResult}"
        
        Generate a natural response that moves the conversation forward. Keep it brief and end with a question.
        If the lead shows interest, try to schedule a follow-up. If they're not interested, politely end the call.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Update call notes
      const updatedNotes = [
        ...(callLog.notes || []),
        {
          timestamp: new Date().toISOString(),
          input: speechResult,
          response: response
        }
      ];

      await supabase
        .from('call_logs')
        .update({ notes: updatedNotes })
        .eq('id', callLog.id);

      // Speak the response
      twiml.say({ voice: 'Polly.Amy' }, response);

      // Continue listening
      twiml.gather({
        input: 'speech',
        action: '/api/twilio/voice',
        method: 'POST',
        speechTimeout: 'auto',
        speechModel: 'phone_call',
      });
    }

    // Return TwiML
    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error handling voice webhook:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(
      { voice: 'Polly.Amy' },
      'I apologize, but I encountered an error. Please try again later.'
    );
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
} 
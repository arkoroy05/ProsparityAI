import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { supabase } from '@/lib/supabase';

const { VoiceResponse } = twilio.twiml;

export async function POST(request) {
  try {
    console.log('Twilio voice webhook called');
    
    // Parse the form data from Twilio
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const taskId = formData.get('taskId');
    const leadId = formData.get('leadId');
    const aiInstructions = formData.get('aiInstructions');
    
    console.log('Call details:', { 
      callSid, 
      taskId, 
      leadId,
      hasAiInstructions: !!aiInstructions
    });

    // Create a new TwiML response
    const twiml = new VoiceResponse();

    try {
      // Fetch task and lead information if available
      let greeting = 'Hello from Prosperity AI.';
      let script = '';

      if (taskId && leadId) {
        const { data: task } = await supabase
          .from('tasks')
          .select(`
            *,
            leads (
              name,
              company_name
            )
          `)
          .eq('id', taskId)
          .single();

        if (task?.leads) {
          const leadName = task.leads.name;
          const companyName = task.leads.company_name;
          
          greeting = `Hello ${leadName}${companyName ? ` from ${companyName}` : ''}, this is an AI assistant from Prosperity AI.`;
          script = aiInstructions || 'I am calling to follow up on your interest in our services.';
        }
      }

      // Log the call in our database
      await supabase
        .from('call_logs')
        .insert([{
          call_sid: callSid,
          task_id: taskId,
          lead_id: leadId,
          status: 'in-progress',
          notes: {
            greeting,
            script,
            timestamp: new Date().toISOString()
          }
        }]);

      // Add pause for natural conversation
      twiml.pause({ length: 1 });
      
      // Add the greeting
      twiml.say(
        { voice: 'Polly.Amy' },
        greeting
      );

      // Add another pause
      twiml.pause({ length: 1 });
      
      // Add the script if available
      if (script) {
        twiml.say(
          { voice: 'Polly.Amy' },
          script
        );
      }

      // Add gather for response
      const gather = twiml.gather({
        input: 'speech',
        action: `/api/twilio/voice-input?callSid=${callSid}`,
        method: 'POST',
        speechTimeout: 'auto',
        language: 'en-US'
      });

      gather.say(
        { voice: 'Polly.Amy' },
        'Please let me know how I can help you today.'
      );

    } catch (error) {
      console.error('Error fetching task/lead data:', error);
      
      // Fallback greeting if there's an error
      twiml.say(
        { voice: 'Polly.Amy' },
        'Hello, this is an AI assistant from Prosperity AI. I apologize, but I am having trouble accessing your information. Please leave a message and someone will get back to you shortly.'
      );
    }
    
    // Convert TwiML to string
    const twimlString = twiml.toString();
    
    // Log the TwiML response
    console.log('TwiML response:', twimlString);
    
    // Return the TwiML response
    return new NextResponse(twimlString, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in Twilio voice webhook:', error);
    
    // Return a basic TwiML response in case of error
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: 'Polly.Amy' },
      'I apologize, but an error occurred with this call. Please try again later.'
    );
    
    return new NextResponse(twiml.toString(), {
      status: 500,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// To handle Twilio's validation requirements
export async function GET(request) {
  const twiml = new VoiceResponse();
  twiml.say(
    { voice: 'Polly.Amy' },
    'Twilio webhook is working.'
  );
  
  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
} 
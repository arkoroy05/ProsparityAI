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
  timeout: 15, // Increased timeout for better speech recognition
  speechModel: 'phone_call', // Optimized for phone calls
  profanityFilter: false, // Allow natural speech without filtering
  hints: [
    'yes', 'no', 'interested', 'not interested', 'busy', 'later',
    'price', 'cost', 'budget', 'demo', 'schedule', 'meeting',
    'more information', 'details', 'help', 'support', 'contact',
    'tell me more', 'how much', 'what is', 'can you', 'I want',
    'I need', 'I would like', 'sounds good', 'not now', 'maybe later',
    'email me', 'call back', 'too expensive', 'already have', 'competitor'
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

        // First, check if we have company settings for this lead
        try {
          const { data: leadData, error: leadError } = await supabase
            .from('leads')
            .select('company_id, name, company_name')
            .eq('id', leadId)
            .single();

          if (leadError) {
            console.error('Error fetching lead data:', leadError);
          } else {
            console.log('Found lead data:', {
              leadName: leadData.name,
              companyName: leadData.company_name,
              companyId: leadData.company_id
            });

            // If we have a company ID, check for company settings
            if (leadData.company_id) {
              const { data: companySettings, error: settingsError } = await supabase
                .from('company_settings')
                .select('ai_instructions')
                .eq('company_id', leadData.company_id)
                .single();

              if (settingsError) {
                console.error('Error fetching company settings:', settingsError);
              } else if (companySettings?.ai_instructions) {
                console.log('Found company-specific AI instructions');
              } else {
                console.log('No company-specific AI instructions found, will use default');
              }
            }
          }
        } catch (dbError) {
          console.error('Database error when checking company settings:', dbError);
        }

        // Create the AI agent
        try {
          callAgent = new AICallAgent(leadId, taskId);
          await callAgent.initialize();
          if (!callAgent.isInitialized) {
            throw new Error('AI agent failed to initialize properly');
          }
          activeCallAgents[callSid] = callAgent;
          console.log('AI call agent created and initialized successfully');
          console.log('Using company name:', callAgent.companyName);
          console.log('Using custom script:', callAgent.customScript ? 'Yes (custom)' : 'No (default)');
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
        // If we don't have a call agent, try to create one
        if (!callAgent) {
          if (leadId && taskId) {
            console.log('Creating new AI call agent for initial greeting:', { leadId, taskId });
            try {
              callAgent = new AICallAgent(leadId, taskId);
              await callAgent.initialize();
              activeCallAgents[callSid] = callAgent;
              console.log('AI call agent created and initialized successfully for greeting');
            } catch (agentError) {
              console.error('Error creating AI call agent for greeting:', agentError);
              // Use fallback greeting instead of throwing
              const fallbackGreeting = leadName
                ? `Hello ${leadName}, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`
                : `Hello, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`;

              createGather(twiml, fallbackGreeting, {
                action: `/api/twilio/voice?retryCount=0&taskId=${taskId}&leadId=${leadId}&leadName=${leadName || ''}`
              });

              return new NextResponse(twiml.toString(), {
                headers: { 'Content-Type': 'text/xml' }
              });
            }
          } else {
            // No lead/task ID, use generic greeting
            console.error('No lead/task ID available for AI agent creation during greeting');
            const genericGreeting = leadName
              ? `Hello ${leadName}, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`
              : `Hello, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`;

            createGather(twiml, genericGreeting, {
              action: `/api/twilio/voice?retryCount=0`
            });

            return new NextResponse(twiml.toString(), {
              headers: { 'Content-Type': 'text/xml' }
            });
          }
        }

        // Try to generate greeting with multiple retries
        let greeting = null;
        console.log('Attempting to generate AI greeting...');

        // Try up to 3 times to get a valid greeting
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Greeting generation attempt ${attempt + 1}...`);
            greeting = await callAgent.getInitialGreeting(leadName);

            if (greeting) {
              console.log(`Successfully generated greeting on attempt ${attempt + 1}`);
              break; // Exit loop if we got a valid greeting
            }
          } catch (greetingError) {
            console.error(`Greeting generation attempt ${attempt + 1} failed:`, greetingError);

            // Only wait between retries, not after the last one
            if (attempt < 2) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }

        // If all attempts failed, use a fallback greeting
        if (!greeting) {
          console.warn('All greeting generation attempts failed, using fallback');
          greeting = leadName
            ? `Hello ${leadName}, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`
            : `Hello, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`;

          // Add this fallback to the conversation history
          if (callAgent) {
            callAgent.conversationHistory.push({
              role: 'agent',
              text: greeting,
              timestamp: new Date().toISOString()
            });
          }
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
        console.error('Critical error in initial greeting:', error);
        // Use generic greeting as absolute fallback
        const fallbackGreeting = leadName
          ? `Hello ${leadName}, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`
          : `Hello, I'm calling from Prosparity.ai about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`;

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
        // Process the input through AI agent
        const userInput = speechResult || digits;
        console.log('Processing user input:', userInput);

        // Check for conversation end signals
        if (checkEndConversation(userInput)) {
          console.log('Conversation end signal detected:', userInput);

          // Generate final insights before ending if we have an agent
          if (callAgent) {
            try {
              const insights = await generateCallInsights(callSid, leadId, callAgent.conversationHistory);
              await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);

              // Generate a personalized goodbye based on the conversation
              let goodbyeMessage = 'Thank you for your time. Have a great day!';
              if (insights?.leadClassification?.interest === 'high') {
                goodbyeMessage = "Thank you for your time! I'll have our team reach out with those additional details right away. Have a great day!";
              } else if (insights?.leadClassification?.needsFollowUp) {
                goodbyeMessage = "Thank you for chatting with me today. We'll follow up at a better time. Have a great day!";
              }

              // Say goodbye
              twiml.say({
                voice: 'Polly.Amy',
                language: 'en-US'
              }, goodbyeMessage);
            } catch (insightError) {
              console.error('Error generating insights during end conversation:', insightError);
              // Use generic goodbye if insights fail
              twiml.say({
                voice: 'Polly.Amy',
                language: 'en-US'
              }, 'Thank you for your time. Have a great day!');
            }

            // Clean up
            delete activeCallAgents[callSid];
          } else {
            // No agent available, use generic goodbye
            twiml.say({
              voice: 'Polly.Amy',
              language: 'en-US'
            }, 'Thank you for your time. Have a great day!');
          }

          return new NextResponse(twiml.toString(), {
            headers: { 'Content-Type': 'text/xml' }
          });
        }

        // If we don't have a call agent, try to create one
        if (!callAgent) {
          if (leadId && taskId) {
            console.log('Creating new AI call agent for user input processing:', { leadId, taskId });
            try {
              callAgent = new AICallAgent(leadId, taskId);
              await callAgent.initialize();
              activeCallAgents[callSid] = callAgent;
              console.log('AI call agent created and initialized successfully for input processing');
            } catch (agentError) {
              console.error('Error creating AI call agent for input processing:', agentError);
              // Use fallback response instead of throwing
              const fallbackResponse = "I apologize, but I'm having trouble processing your request. Could you please repeat that?";
              createGather(twiml, fallbackResponse, {
                action: `/api/twilio/voice?retryCount=${retryCount + 1}&taskId=${taskId}&leadId=${leadId}&leadName=${leadName || ''}`
              });
              return new NextResponse(twiml.toString(), {
                headers: { 'Content-Type': 'text/xml' }
              });
            }
          } else {
            // No lead/task ID, use generic response
            console.error('No lead/task ID available for AI agent creation');
            const genericResponse = "I'm sorry, I didn't catch that. Could you please tell me more about what you're looking for?";
            createGather(twiml, genericResponse, {
              action: `/api/twilio/voice?retryCount=${retryCount + 1}`
            });
            return new NextResponse(twiml.toString(), {
              headers: { 'Content-Type': 'text/xml' }
            });
          }
        }

        // Get AI response with multiple retries if needed
        let aiResponse = null;

        // Try up to 3 times to get a valid response
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            console.log(`Attempt ${attempt + 1} to get AI response...`);
            aiResponse = await callAgent.processSpeech(userInput);

            if (aiResponse) {
              console.log(`Successfully generated AI response on attempt ${attempt + 1}`);
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

        // If all attempts failed, use a context-aware fallback
        if (!aiResponse) {
          console.warn('All AI response attempts failed, using fallback response');

          // Try to determine what the user was asking about
          const userInputLower = userInput.toLowerCase();
          if (userInputLower.includes('price') || userInputLower.includes('cost')) {
            aiResponse = "Our pricing is customized based on your specific needs. Could you tell me more about your business requirements so I can provide more accurate information?";
          } else if (userInputLower.includes('demo') || userInputLower.includes('try')) {
            aiResponse = "I'd be happy to arrange a demo for you. Could I get your email address to schedule a time with one of our product specialists?";
          } else if (userInputLower.includes('how') || userInputLower.includes('what')) {
            aiResponse = "That's a great question. Our solution helps businesses improve efficiency and productivity. Could you tell me more about your specific challenges so I can explain how we might help?";
          } else {
            aiResponse = "I appreciate your input. To better assist you, could you tell me more about your current business challenges?";
          }

          // Add this fallback response to the conversation history
          if (callAgent) {
            callAgent.trackAIResponse(aiResponse);
          }
        }

        console.log('Final AI response:', aiResponse);

        // Create gather with AI response and pass through parameters
        createGather(twiml, aiResponse, {
          action: `/api/twilio/voice?retryCount=0&taskId=${taskId}&leadId=${leadId}&leadName=${leadName || ''}`
        });

        // Save conversation progress if we have an agent
        if (callAgent) {
          try {
            await saveCallTranscript(callSid, leadId, taskId, callAgent.conversationHistory);
          } catch (saveError) {
            console.error('Error saving call transcript:', saveError);
            // Continue without throwing - this is non-critical
          }
        }

        return new NextResponse(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      } catch (error) {
        console.error('Critical error processing user input:', error);

        // Determine appropriate fallback based on retry count
        let fallbackResponse;
        if (retryCount >= 2) {
          // Final retry - end the call with a polite message
          const finalResponses = [
            "I'm having some technical difficulties. Let me have one of our team members call you back to continue this conversation.",
            "I apologize for the connection issues. I'll arrange for a representative to follow up with you directly.",
            "It seems we're experiencing some technical problems. I'll make sure someone from our team reaches out to you soon."
          ];

          fallbackResponse = finalResponses[Math.floor(Math.random() * finalResponses.length)];
          twiml.say({
            voice: 'Polly.Amy',
            language: 'en-US'
          }, fallbackResponse);
          twiml.hangup();
        } else {
          // Still have retries left - try again with varied messages
          const retryResponses = [
            "I apologize, but I didn't quite catch that. Could you please repeat what you were saying?",
            "I'm sorry, I'm having trouble understanding. Could you try again?",
            "I didn't get that clearly. Could you please speak a bit more slowly?",
            "Sorry about that, could you please rephrase what you just said?"
          ];

          fallbackResponse = retryResponses[Math.floor(Math.random() * retryResponses.length)];
          createGather(twiml, fallbackResponse, {
            action: `/api/twilio/voice?retryCount=${retryCount + 1}&taskId=${taskId}&leadId=${leadId}&leadName=${leadName || ''}`
          });
        }

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

    // Prompt for input again with varied responses based on retry count
    const noInputResponses = [
      "I didn't catch that. Could you please respond?",
      "I'm having trouble hearing you. Could you speak a bit louder or clearer?",
      "I apologize, but I'm not catching what you're saying. Could you try again?"
    ];

    // Use different response based on retry count
    const responseIndex = Math.min(retryCount, noInputResponses.length - 1);

    createGather(twiml, noInputResponses[responseIndex], {
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
import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from 'twilio';
import { supabase } from './supabase';
import { updateTask } from './task-utils';
import { updateLead } from './lead-utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Schedule a call to be executed by the AI agent
 * @param {Object} callData - Information about the call to schedule
 * @returns {Promise<Object>} - Result of scheduling the call
 */
export async function scheduleCall(callData) {
  try {
    const {
      leadId,
      companyId,
      scheduledTime,
      objective,
      taskId,
      phoneNumber,
      notes = ''
    } = callData;

    // Validate required fields
    if (!leadId || !companyId || !scheduledTime || !phoneNumber) {
      throw new Error('Missing required fields for call scheduling');
    }

    // Create a call record in the database
    const { data, error } = await supabase
      .from('scheduled_calls')
      .insert([
        {
          lead_id: leadId,
          company_id: companyId,
          scheduled_time: scheduledTime,
          objective: objective || 'Follow up with lead',
          task_id: taskId || null,
          phone_number: phoneNumber,
          status: 'scheduled',
          notes
        }
      ])
      .select();

    if (error) throw error;

    return {
      success: true,
      message: 'Call scheduled successfully',
      callId: data[0].id,
      scheduledTime
    };
  } catch (error) {
    console.error('Error scheduling call:', error);
    return {
      success: false,
      message: error.message || 'Failed to schedule call'
    };
  }
}

/**
 * Execute a scheduled call
 * @param {string} callId - ID of the scheduled call
 * @returns {Promise<Object>} - Result of executing the call
 */
export async function executeCall(callId) {
  try {
    // Fetch the call details
    const { data: callData, error: callError } = await supabase
      .from('scheduled_calls')
      .select(`
        *,
        leads (
          *
        ),
        companies (
          *
        ),
        tasks (
          *
        )
      `)
      .eq('id', callId)
      .single();

    if (callError) throw callError;
    if (!callData) throw new Error('Call not found');

    // Check if call is already completed or in progress
    if (callData.status === 'completed' || callData.status === 'in_progress') {
      return {
        success: false,
        message: `Call is already ${callData.status}`
      };
    }

    // Update call status to in_progress
    await supabase
      .from('scheduled_calls')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', callId);

    // Get company's knowledge base
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('company_id', callData.company_id);

    if (kbError) console.error('Error fetching knowledge base:', kbError);

    // Get previous conversations with this lead
    const { data: prevConversations, error: convError } = await supabase
      .from('call_logs')
      .select('*')
      .eq('lead_id', callData.lead_id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (convError) console.error('Error fetching previous conversations:', convError);

    // Prepare context for the AI
    const context = {
      companyInfo: callData.companies || {},
      leadInfo: callData.leads || {},
      callObjective: callData.objective,
      companyKnowledgeBase: knowledgeBase || [],
      previousConversations: prevConversations || []
    };

    // Generate talking points
    const talkingPoints = await generateTalkingPoints(
      callData.leads || {},
      callData.companies || {}
    );

    // Prepare Twilio callback URL with context
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/webhook/${callId}`;

    // Make the actual call using Twilio
    const twilioResult = await makeCall(
      callData.phone_number,
      process.env.TWILIO_PHONE_NUMBER,
      callbackUrl
    );

    if (!twilioResult.success) {
      await supabase
        .from('scheduled_calls')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          notes: `Failed to make call: ${twilioResult.error}`
        })
        .eq('id', callId);

      return {
        success: false,
        message: 'Failed to initiate call with Twilio',
        error: twilioResult.error
      };
    }

    // Store the Twilio call SID for reference
    await supabase
      .from('scheduled_calls')
      .update({
        twilio_call_sid: twilioResult.callSid,
        talking_points: JSON.stringify(talkingPoints)
      })
      .eq('id', callId);

    return {
      success: true,
      message: 'Call initiated successfully',
      callSid: twilioResult.callSid
    };
  } catch (error) {
    console.error('Error executing call:', error);
    
    // Update call status to failed
    await supabase
      .from('scheduled_calls')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        notes: `Error executing call: ${error.message}`
      })
      .eq('id', callId);
      
    return {
      success: false,
      message: error.message || 'Failed to execute call'
    };
  }
}

/**
 * Process the conversation from a call and update records
 * @param {string} callId - ID of the call
 * @param {string} conversationText - Text of the conversation
 * @returns {Promise<Object>} - Result of processing the conversation
 */
export async function processCallConversation(callId, conversationText) {
  try {
    // Fetch the call details
    const { data: callData, error: callError } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (callError) throw callError;
    if (!callData) throw new Error('Call not found');

    // Analyze the conversation
    const analysis = await analyzeConversation(conversationText);

    // Update the call record with the conversation and analysis
    await supabase
      .from('scheduled_calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        conversation_text: conversationText,
        conversation_analysis: analysis,
        summary: analysis.summary || 'Call completed'
      })
      .eq('id', callId);

    // Create a call log entry
    await supabase
      .from('call_logs')
      .insert([
        {
          lead_id: callData.lead_id,
          company_id: callData.company_id,
          conversation: conversationText,
          summary: analysis.summary || 'Call completed',
          sentiment: analysis.sentiment || 'neutral',
          next_steps: analysis.nextSteps || null,
          effectiveness: analysis.effectiveness || 5
        }
      ]);

    // Update the lead status based on the call outcome
    if (callData.lead_id) {
      const leadUpdate = {
        last_contacted_at: new Date().toISOString(),
        notes: `${callData.objective || 'Call'} - ${analysis.summary || 'Completed'}`
      };

      // If sentiment is positive, update lead status to 'interested'
      if (analysis.sentiment === 'positive') {
        leadUpdate.status = 'interested';
      }

      await updateLead(callData.lead_id, leadUpdate);
    }

    // Update the associated task if there is one
    if (callData.task_id) {
      await updateTask(callData.task_id, {
        status: 'completed',
        result: analysis.summary || 'Call completed'
      });
    }

    return {
      success: true,
      message: 'Call conversation processed successfully',
      analysis
    };
  } catch (error) {
    console.error('Error processing call conversation:', error);
    return {
      success: false,
      message: error.message || 'Failed to process call conversation'
    };
  }
}

/**
 * Get AI response during a live conversation
 * @param {string} callId - ID of the call
 * @param {string} userInput - Text from the user/lead
 * @returns {Promise<string>} - AI response
 */
export async function getAIResponse(callId, userInput) {
  try {
    // Fetch call context
    const { data: callData, error: callError } = await supabase
      .from('scheduled_calls')
      .select(`
        *,
        leads (
          *
        ),
        companies (
          *
        )
      `)
      .eq('id', callId)
      .single();

    if (callError) throw callError;

    // Get conversation history for this call
    const { data: conversationHistory, error: historyError } = await supabase
      .from('conversation_turns')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: true });

    if (historyError) throw historyError;

    // Get company's knowledge base
    const { data: knowledgeBase, error: kbError } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('company_id', callData.company_id);

    if (kbError) console.error('Error fetching knowledge base:', kbError);

    // Format conversation history for context
    const formattedConversation = conversationHistory
      ? conversationHistory.map(turn => `${turn.role === 'user' ? 'Lead' : 'AI'}: ${turn.message}`).join('\n')
      : '';

    // Prepare context for the AI
    const context = {
      companyInfo: callData.companies || {},
      leadInfo: callData.leads || {},
      callObjective: callData.objective,
      companyKnowledgeBase: knowledgeBase || [],
      previousConversation: formattedConversation
    };

    // Get AI response
    const response = await generateResponse(userInput, context);

    // Save the user input and AI response to the conversation history
    await supabase
      .from('conversation_turns')
      .insert([
        {
          call_id: callId,
          role: 'user',
          message: userInput,
          created_at: new Date().toISOString()
        },
        {
          call_id: callId,
          role: 'assistant',
          message: response,
          created_at: new Date().toISOString()
        }
      ]);

    return response;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "I'm sorry, I'm having trouble processing your request at the moment. Let me get someone to help you.";
  }
}

/**
 * Check for upcoming scheduled calls and execute them
 * @returns {Promise<Object>} - Result of processing scheduled calls
 */
export async function processScheduledCalls() {
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    
    // Find calls that are scheduled to happen in the next 5 minutes
    const { data: upcomingCalls, error } = await supabase
      .from('scheduled_calls')
      .select('*')
      .eq('status', 'scheduled')
      .lt('scheduled_time', fiveMinutesFromNow.toISOString())
      .gte('scheduled_time', now.toISOString());
      
    if (error) throw error;
    
    if (!upcomingCalls || upcomingCalls.length === 0) {
      return {
        success: true,
        message: 'No upcoming calls to process',
        processed: 0
      };
    }
    
    const results = await Promise.all(
      upcomingCalls.map(call => executeCall(call.id))
    );
    
    return {
      success: true,
      message: `Processed ${results.length} scheduled calls`,
      processed: results.length,
      results
    };
  } catch (error) {
    console.error('Error processing scheduled calls:', error);
    return {
      success: false,
      message: error.message || 'Failed to process scheduled calls'
    };
  }
}

export class AICallService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async handleCall(taskId, leadId) {
    try {
      const { data: task } = await this.supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      const { data: lead } = await this.supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!task || !lead) {
        throw new Error('Task or lead not found');
      }

      // Update task status
      await updateTask(this.supabase, taskId, {
        status: 'in_progress',
        started_at: new Date().toISOString()
      });

      // Update lead status
      await updateLead(this.supabase, leadId, {
        status: 'contacted',
        last_contacted_at: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Error in handleCall:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AICallService; 
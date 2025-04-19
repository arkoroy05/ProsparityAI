import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from 'twilio';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class AICallAgent {
  constructor() {
    this.tools = {
      makeCall: this.makeCall.bind(this),
      generateScript: this.generateScript.bind(this),
      updateCallStatus: this.updateCallStatus.bind(this),
      processCallInput: this.processCallInput.bind(this)
    };
  }

  async execute(instruction, context) {
    try {
      // Initialize the conversation with Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: `You are an AI calling agent. You have access to the following tools:
            1. makeCall - Make a phone call to a lead
            2. generateScript - Generate a conversation script
            3. updateCallStatus - Update the status of a call
            4. processCallInput - Process input from a live call
            
            Current context: ${JSON.stringify(context)}
            
            Instruction: ${instruction}`
          }
        ]
      });

      // Get the AI's response
      const result = await chat.sendMessage(instruction);
      const response = await result.response;
      const text = response.text();

      // Parse the response to determine which tool to use
      const toolCall = this.parseToolCall(text);
      if (!toolCall) {
        return { success: false, error: "Invalid tool call" };
      }

      // Execute the tool
      const toolResult = await this.tools[toolCall.name](...toolCall.args);
      return toolResult;
    } catch (error) {
      console.error('Error in AI call agent:', error);
      return { success: false, error: error.message };
    }
  }

  parseToolCall(text) {
    // Simple parsing for demonstration - in production, use a more robust parser
    const match = text.match(/TOOL_CALL:(\w+)\s*\((.*)\)/);
    if (!match) return null;

    const [, name, argsStr] = match;
    const args = argsStr.split(',').map(arg => arg.trim());
    return { name, args };
  }

  async makeCall(phoneNumber, leadInfo, companyInfo) {
    try {
      // Generate conversation script
      const script = await this.generateScript(leadInfo, companyInfo);
      
      // Create TwiML for the call
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Polly.Amy' }, script);
      
      // Make the call
      const call = await twilioClient.calls.create({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice-handler`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['completed', 'failed'],
        twiml: twiml.toString()
      });

      // Log the call
      const { error: logError } = await supabase
        .from('call_logs')
        .insert({
          company_id: companyInfo.id,
          lead_id: leadInfo.id,
          call_sid: call.sid,
          status: 'initiated',
          script: script
        });

      if (logError) throw logError;

      return {
        success: true,
        callSid: call.sid,
        script: script
      };
    } catch (error) {
      console.error('Error making call:', error);
      return { success: false, error: error.message };
    }
  }

  async generateScript(leadInfo, companyInfo) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Generate a natural sales conversation script for calling a lead with the following information:
      Lead Name: ${leadInfo.name}
      Company: ${leadInfo.company_name}
      Industry: ${companyInfo.industry}
      Company Size: ${companyInfo.size}
      
      The script should be:
      1. Conversational and professional
      2. Focused on understanding their needs
      3. Include a clear introduction
      4. Have natural pauses for responses
      5. End with a clear next step or call to action`;
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating script:', error);
      throw error;
    }
  }

  async updateCallStatus(callSid, status) {
    try {
      const { error } = await supabase
        .from('call_logs')
        .update({ status })
        .eq('call_sid', callSid);

      if (error) throw error;

      if (status === 'completed') {
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('lead_id')
          .eq('call_sid', callSid)
          .single();

        if (callLog) {
          await supabase
            .from('leads')
            .update({ status: 'contacted' })
            .eq('id', callLog.lead_id);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating call status:', error);
      return { success: false, error: error.message };
    }
  }

  async processCallInput(callSid, input) {
    try {
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_sid', callSid)
        .single();

      if (!callLog) throw new Error('Call log not found');

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Based on the following conversation context and user input, generate a natural response:
      
      Original Script: ${callLog.script}
      User Input: ${input}
      
      The response should be:
      1. Relevant to the user's input
      2. Maintain the conversation flow
      3. Be concise and clear
      4. Guide towards the call's objective`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      await supabase
        .from('call_logs')
        .update({
          notes: JSON.stringify([
            ...(callLog.notes ? JSON.parse(callLog.notes) : []),
            { input, response, timestamp: new Date().toISOString() }
          ])
        })
        .eq('call_sid', callSid);

      return { success: true, response };
    } catch (error) {
      console.error('Error processing call input:', error);
      return { success: false, error: error.message };
    }
  }
}

export const aiCallAgent = new AICallAgent(); 
import twilio from 'twilio';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

class AICallAgent {
  constructor() {
    this.tools = {
      makeCall: this.makeCall.bind(this),
      generateScript: this.generateScript.bind(this),
      updateCallStatus: this.updateCallStatus.bind(this),
      processCallInput: this.processCallInput.bind(this)
    };
  }

  async execute(instruction, context) {
    try {
      // Initialize the conversation with Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: `You are an AI calling agent. You have access to the following tools:
            1. makeCall - Make a phone call to a lead
            2. generateScript - Generate a conversation script
            3. updateCallStatus - Update the status of a call
            4. processCallInput - Process input from a live call
            
            Current context: ${JSON.stringify(context)}
            
            Instruction: ${instruction}`
          }
        ]
      });

      // Get the AI's response
      const result = await chat.sendMessage(instruction);
      const response = await result.response;
      const text = response.text();

      // Parse the response to determine which tool to use
      const toolCall = this.parseToolCall(text);
      if (!toolCall) {
        return { success: false, error: "Invalid tool call" };
      }

      // Execute the tool
      const toolResult = await this.tools[toolCall.name](...toolCall.args);
      return toolResult;
    } catch (error) {
      console.error('Error in AI call agent:', error);
      return { success: false, error: error.message };
    }
  }

  parseToolCall(text) {
    // Simple parsing for demonstration - in production, use a more robust parser
    const match = text.match(/TOOL_CALL:(\w+)\s*\((.*)\)/);
    if (!match) return null;

    const [, name, argsStr] = match;
    const args = argsStr.split(',').map(arg => arg.trim());
    return { name, args };
  }

  async makeCall(phoneNumber, leadInfo, companyInfo) {
    try {
      // Generate conversation script
      const script = await this.generateScript(leadInfo, companyInfo);
      
      // Create TwiML for the call
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Polly.Amy' }, script);
      
      // Make the call
      const call = await twilioClient.calls.create({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice-handler`,
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['completed', 'failed'],
        twiml: twiml.toString()
      });

      // Log the call
      const { error: logError } = await supabase
        .from('call_logs')
        .insert({
          company_id: companyInfo.id,
          lead_id: leadInfo.id,
          call_sid: call.sid,
          status: 'initiated',
          script: script
        });

      if (logError) throw logError;

      return {
        success: true,
        callSid: call.sid,
        script: script
      };
    } catch (error) {
      console.error('Error making call:', error);
      return { success: false, error: error.message };
    }
  }

  async generateScript(leadInfo, companyInfo) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Generate a natural sales conversation script for calling a lead with the following information:
      Lead Name: ${leadInfo.name}
      Company: ${leadInfo.company_name}
      Industry: ${companyInfo.industry}
      Company Size: ${companyInfo.size}
      
      The script should be:
      1. Conversational and professional
      2. Focused on understanding their needs
      3. Include a clear introduction
      4. Have natural pauses for responses
      5. End with a clear next step or call to action`;
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Error generating script:', error);
      throw error;
    }
  }

  async updateCallStatus(callSid, status) {
    try {
      const { error } = await supabase
        .from('call_logs')
        .update({ status })
        .eq('call_sid', callSid);

      if (error) throw error;

      if (status === 'completed') {
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('lead_id')
          .eq('call_sid', callSid)
          .single();

        if (callLog) {
          await supabase
            .from('leads')
            .update({ status: 'contacted' })
            .eq('id', callLog.lead_id);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating call status:', error);
      return { success: false, error: error.message };
    }
  }

  async processCallInput(callSid, input) {
    try {
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_sid', callSid)
        .single();

      if (!callLog) throw new Error('Call log not found');

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Based on the following conversation context and user input, generate a natural response:
      
      Original Script: ${callLog.script}
      User Input: ${input}
      
      The response should be:
      1. Relevant to the user's input
      2. Maintain the conversation flow
      3. Be concise and clear
      4. Guide towards the call's objective`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      await supabase
        .from('call_logs')
        .update({
          notes: JSON.stringify([
            ...(callLog.notes ? JSON.parse(callLog.notes) : []),
            { input, response, timestamp: new Date().toISOString() }
          ])
        })
        .eq('call_sid', callSid);

      return { success: true, response };
    } catch (error) {
      console.error('Error processing call input:', error);
      return { success: false, error: error.message };
    }
  }
}

export const aiCallAgent = new AICallAgent(); 
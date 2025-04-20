import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from 'twilio';
import { supabase } from './supabase';
import { PineconeClient } from '@pinecone-database/pinecone';

class AIAgent {
  constructor() {
    // Initialize AI services
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Initialize Pinecone
    this.pinecone = new PineconeClient();
    this.initializePinecone();
  }

  async initializePinecone() {
    await this.pinecone.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: "gcp-starter"
    });
    this.index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME);
  }

  async execute(instruction, context) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: `You are an AI sales agent with the following capabilities:
            1. Schedule and make calls to leads
            2. Generate natural conversation scripts
            3. Process real-time voice input
            4. Generate insights from conversations
            5. Store and analyze call data
            6. Perform sentiment analysis
            7. Handle call recordings
            
            Available tools:
            - scheduleCall: Schedule a call for a specific time
            - makeCall: Make a phone call to a lead
            - generateScript: Generate a conversation script
            - processCallInput: Process real-time voice input
            - generateInsights: Generate insights from call data
            - storeConversation: Store conversation in vector database
            - analyzeCall: Analyze call performance and outcomes
            - analyzeSentiment: Analyze sentiment of conversation
            - handleRecording: Process call recording
            
            Current context: ${JSON.stringify(context)}
            
            Instruction: ${instruction}`
          }
        ]
      });

      const result = await chat.sendMessage(instruction);
      const response = await result.response;
      const text = response.text();

      const toolCall = this.parseToolCall(text);
      if (!toolCall) {
        return { success: false, error: "Invalid tool call" };
      }

      return await this.tools[toolCall.name](...toolCall.args);
    } catch (error) {
      console.error('Error in AI agent:', error);
      return { success: false, error: error.message };
    }
  }

  async scheduleCall(leadInfo, companyInfo, scheduledTime) {
    try {
      const { error } = await supabase
        .from('scheduled_calls')
        .insert({
          lead_id: leadInfo.id,
          company_id: companyInfo.id,
          scheduled_at: scheduledTime,
          status: 'scheduled'
        });

      if (error) throw error;

      // Schedule the actual call
      setTimeout(async () => {
        await this.makeCall(leadInfo.phone, leadInfo, companyInfo);
      }, scheduledTime - Date.now());

      return { success: true };
    } catch (error) {
      console.error('Error scheduling call:', error);
      return { success: false, error: error.message };
    }
  }

  async makeCall(phoneNumber, leadInfo, companyInfo) {
    try {
      const script = await this.generateScript(leadInfo, companyInfo);
      
      // Clean and format the phone number
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;

      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({ voice: 'Polly.Amy' }, script);
      twiml.record({
        action: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/recording-handler`,
        method: 'POST',
        maxLength: 3600,
        playBeep: true
      });
      
      const call = await this.twilioClient.calls.create({
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/voice-handler`,
        to: formattedPhone,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
        statusCallbackEvent: ['completed', 'failed'],
        twiml: twiml.toString()
      });

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

  async processCallInput(callSid, input) {
    try {
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('*')
        .eq('call_sid', callSid)
        .single();

      if (!callLog) throw new Error('Call log not found');

      // Generate response using Gemini
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
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

      // Store the conversation and analyze sentiment
      await this.storeConversation(callSid, input, response);
      await this.analyzeSentiment(callSid, input);

      return { success: true, response };
    } catch (error) {
      console.error('Error processing call input:', error);
      return { success: false, error: error.message };
    }
  }

  async storeConversation(callSid, input, response) {
    try {
      // Store in Pinecone using native embeddings
      await this.index.upsert([
        {
          id: `${callSid}_input`,
          values: input,
          metadata: {
            callSid,
            type: 'input',
            text: input,
            timestamp: new Date().toISOString()
          }
        },
        {
          id: `${callSid}_response`,
          values: response,
          metadata: {
            callSid,
            type: 'response',
            text: response,
            timestamp: new Date().toISOString()
          }
        }
      ]);

      // Update call log with conversation
      const { data: callLog } = await supabase
        .from('call_logs')
        .select('notes')
        .eq('call_sid', callSid)
        .single();

      await supabase
        .from('call_logs')
        .update({
          notes: JSON.stringify([
            ...(callLog.notes ? JSON.parse(callLog.notes) : []),
            { input, response, timestamp: new Date().toISOString() }
          ])
        })
        .eq('call_sid', callSid);

      return { success: true };
    } catch (error) {
      console.error('Error storing conversation:', error);
      return { success: false, error: error.message };
    }
  }

  async analyzeSentiment(callSid, text) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `Analyze the sentiment of the following text and provide a score from -1 (very negative) to 1 (very positive):
      
      Text: ${text}
      
      Return the analysis in JSON format with:
      - sentiment_score: number
      - key_emotions: array of strings
      - confidence: number`;

      const result = await model.generateContent(prompt);
      const analysis = JSON.parse(result.response.text());

      await supabase
        .from('call_sentiment')
        .insert({
          call_sid: callSid,
          sentiment_score: analysis.sentiment_score,
          key_emotions: analysis.key_emotions,
          confidence: analysis.confidence,
          text: text
        });

      return { success: true, analysis };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { success: false, error: error.message };
    }
  }

  async handleRecording(callSid, recordingUrl) {
    try {
      // Store recording URL
      await supabase
        .from('call_logs')
        .update({ recording_url: recordingUrl })
        .eq('call_sid', callSid);

      // Transcribe recording
      const transcription = await this.transcribeRecording(recordingUrl);

      // Store transcription
      await supabase
        .from('call_transcriptions')
        .insert({
          call_sid: callSid,
          transcription: transcription
        });

      return { success: true, transcription };
    } catch (error) {
      console.error('Error handling recording:', error);
      return { success: false, error: error.message };
    }
  }

  async transcribeRecording(recordingUrl) {
    // Implement transcription logic here
    // This could use Twilio's transcription service or another provider
    return "Transcription placeholder";
  }

  parseToolCall(text) {
    const match = text.match(/TOOL_CALL:(\w+)\s*\((.*)\)/);
    if (!match) return null;

    const [, name, argsStr] = match;
    const args = argsStr.split(',').map(arg => arg.trim());
    return { name, args };
  }
}

export const aiAgent = new AIAgent();
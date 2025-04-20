import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export class AICallAgent {
  constructor(leadId, taskId) {
    this.leadId = leadId;
    this.taskId = taskId;
    this.conversationHistory = [];
    this.retryCount = 0;
    this.leadClassification = {
      interest: null, // 'high', 'medium', 'low', 'none'
      objections: [],
      needsFollowUp: false,
      followUpDate: null,
      insights: []
    };
  }

  async processSpeech(speechInput) {
    if (!speechInput) return;
    
    try {
      // Add to conversation history
      this.conversationHistory.push({
        role: 'lead',
        text: speechInput,
        timestamp: new Date().toISOString()
      });
      
      // Analyze speech for sentiment and intent
      await this.analyzeLeadIntent(speechInput);
      
      // Get lead context from database
      const { data: leadData } = await supabase
        .from('leads')
        .select('*, companies (*)')
        .eq('id', this.leadId)
        .single();

      // Get previous conversations
      const { data: previousCalls } = await supabase
        .from('call_logs')
        .select('conversation, summary, sentiment')
        .eq('lead_id', this.leadId)
        .order('created_at', { ascending: false })
        .limit(3);

      // Prepare context for response generation
      const context = {
        leadInfo: leadData,
        companyInfo: leadData?.companies,
        currentClassification: this.leadClassification,
        conversationHistory: this.conversationHistory,
        previousCalls: previousCalls || [],
        currentObjective: this.getCallObjective()
      };

      // Generate contextual response
      const response = await this.generateContextualResponse(speechInput, context);
      
      // Track the response
      this.trackAIResponse(response);
      
      // Update lead classification in database
      await this.updateLeadInsights();

      // Reset retry count since we got a response
      this.retryCount = 0;
      
      return response;
    } catch (error) {
      console.error('Error processing lead speech:', error);
      return this.handleError(error);
    }
  }
  
  analyzeLeadIntent(speech) {
    const text = speech.toLowerCase();
    
    // Simple intent detection based on keywords
    if (text.includes('interested') || text.includes('tell me more') || text.includes('sounds good')) {
      this.leadClassification.interest = 'high';
      this.leadClassification.insights.push('Lead expressed explicit interest');
    } else if (text.includes('not interested') || text.includes('no thanks') || text.includes('stop calling')) {
      this.leadClassification.interest = 'none';
      this.leadClassification.insights.push('Lead explicitly declined interest');
    } else if (text.includes('maybe') || text.includes('not sure') || text.includes('thinking about it')) {
      this.leadClassification.interest = 'medium';
      this.leadClassification.insights.push('Lead showing moderate interest');
    }
    
    // Detect common objections
    if (text.includes('expensive') || text.includes('cost') || text.includes('price')) {
      this.leadClassification.objections.push('Price concern');
    }
    
    if (text.includes('competitors') || text.includes('already using')) {
      this.leadClassification.objections.push('Using competitor product');
    }
    
    if (text.includes('later') || text.includes('busy') || text.includes('another time')) {
      this.leadClassification.needsFollowUp = true;
      this.leadClassification.followUpDate = this.calculateFollowUpDate();
      this.leadClassification.insights.push('Lead requested follow-up at a later time');
    }
    
    // Track valuable information about the lead
    if (text.includes('team') && text.includes('size')) {
      this.leadClassification.insights.push('Lead mentioned team size - potential qualification data');
    }
    
    // Add the analyzed information to the history
    this.conversationHistory.push({
      role: 'system',
      text: `[Analysis: Interest level: ${this.leadClassification.interest || 'unknown'}, 
              Objections: ${this.leadClassification.objections.length > 0 ? this.leadClassification.objections.join(', ') : 'none detected'}]`,
      timestamp: new Date().toISOString()
    });
  }
  
  async generateContextualResponse(userInput, context) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a comprehensive prompt
    const prompt = `
      You are an AI sales agent having a conversation with a lead. Your goal is to qualify the lead and move them through the sales process naturally.

      Current Context:
      - Lead Name: ${context.leadInfo?.name || 'Unknown'}
      - Company: ${context.leadInfo?.company_name || 'Unknown'}
      - Current Interest Level: ${context.currentClassification.interest || 'Unknown'}
      - Identified Objections: ${context.currentClassification.objections.join(', ') || 'None'}
      - Call Objective: ${context.currentObjective || 'Qualify lead and identify needs'}

      Conversation History:
      ${this.formatConversationHistory(context.conversationHistory)}

      Previous Interactions:
      ${this.formatPreviousInteractions(context.previousCalls)}

      Lead's Last Input: "${userInput}"

      Please generate a natural, contextually appropriate response that:
      1. Acknowledges the lead's input
      2. Addresses any concerns or objections
      3. Gathers more qualifying information
      4. Moves the conversation toward the objective
      5. Maintains a professional but friendly tone

      The response should be concise (2-3 sentences) and conversational.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Clean up the response
      return this.cleanResponse(response);
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.getFallbackResponse();
    }
  }

  formatConversationHistory(history) {
    if (!history || history.length === 0) return 'No previous conversation';
    
    return history
      .slice(-5) // Only use last 5 exchanges for context
      .map(entry => `${entry.role}: ${entry.text}`)
      .join('\n');
  }

  formatPreviousInteractions(previousCalls) {
    if (!previousCalls || previousCalls.length === 0) return 'No previous calls';
    
    return previousCalls
      .map(call => `Previous Call Summary: ${call.summary || 'No summary'}\nSentiment: ${call.sentiment || 'neutral'}`)
      .join('\n\n');
  }

  getCallObjective() {
    const { interest, objections } = this.leadClassification;
    
    if (interest === 'high') {
      return 'Schedule a demo or follow-up call';
    } else if (interest === 'medium') {
      return 'Address objections and build interest';
    } else if (objections.length > 0) {
      return 'Address key objections: ' + objections.join(', ');
    } else {
      return 'Qualify lead and identify needs';
    }
  }

  cleanResponse(response) {
    // Remove any system-like prefixes
    response = response.replace(/^(AI|Assistant|Response):\s*/i, '');
    
    // Remove quotes if the entire response is quoted
    response = response.replace(/^"(.*)"$/, '$1');
    
    // Ensure the response isn't too long
    if (response.length > 200) {
      response = response.substring(0, 197) + '...';
    }
    
    return response;
  }

  getFallbackResponse() {
    const fallbacks = [
      "I understand. Could you tell me more about your specific needs?",
      "That's interesting. How does this challenge affect your business?",
      "I see. What would be most helpful for you right now?",
      "Could you elaborate on that point?",
      "What specific outcomes are you looking to achieve?"
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  handleError(error) {
    console.error('AI Agent Error:', error);
    return "I apologize, but I'm having trouble processing that. Could you rephrase your question, or would you prefer to speak with a human representative?";
  }

  async handleRetry() {
    this.retryCount++;
    
    if (this.retryCount >= 3) {
      return {
        shouldEnd: true,
        message: "I haven't heard a response. I'll try to reach you at a better time. Have a great day!"
      };
    }
    
    // Get the last AI response from conversation history
    const lastAIResponse = this.conversationHistory
      .filter(entry => entry.role === 'ai')
      .pop();
    
    return {
      shouldEnd: false,
      message: "I'm sorry, I didn't catch that. " + (lastAIResponse 
        ? "Let me repeat: " + lastAIResponse.text 
        : "Could you please respond?")
    };
  }

  async updateLeadInsights() {
    try {
      if (!this.leadId) return;
      
      // Get current lead data
      const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', this.leadId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching lead for insight update:', fetchError);
        return;
      }
      
      // Update lead with new insights
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          ai_insights: {
            ...(lead.ai_insights || {}),
            classification: this.leadClassification,
            lastUpdated: new Date().toISOString()
          },
          last_contact_result: this.leadClassification.interest || 'unknown',
          needs_followup: this.leadClassification.needsFollowUp,
          followup_date: this.leadClassification.followUpDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.leadId);
      
      if (updateError) {
        console.error('Error updating lead insights:', updateError);
      }
    } catch (error) {
      console.error('Error in updateLeadInsights:', error);
    }
  }
  
  calculateFollowUpDate() {
    const date = new Date();
    let daysToAdd = 3;
    
    while (daysToAdd > 0) {
      date.setDate(date.getDate() + 1);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        daysToAdd--;
      }
    }
    
    return date.toISOString();
  }
  
  trackAIResponse(response) {
    this.conversationHistory.push({
      role: 'ai',
      text: response,
      timestamp: new Date().toISOString()
    });
  }
}
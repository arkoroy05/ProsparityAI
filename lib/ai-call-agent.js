import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from 'twilio';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * AI Call Agent - Handles lead classification and conversation management
 * for outbound AI sales calls.
 */
export class AICallAgent {
  constructor(leadId, taskId) {
    this.leadId = leadId;
    this.taskId = taskId;
    this.conversationHistory = [];
    this.leadClassification = {
      interest: null, // 'high', 'medium', 'low', 'none'
      objections: [],
      needsFollowUp: false,
      followUpDate: null,
      insights: []
    };
  }

  /**
   * Process speech input from the lead and update classification
   */
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
      this.analyzeLeadIntent(speechInput);
      
      // Update lead classification in database
      await this.updateLeadInsights();
      
      return this.generateResponse(speechInput);
    } catch (error) {
      console.error('Error processing lead speech:', error);
      return "I apologize, but I'm having trouble processing that. Could you repeat your question?";
    }
  }
  
  /**
   * Analyze the lead's speech for intent and sentiment
   */
  analyzeLeadIntent(speech) {
    const text = speech.toLowerCase();
    
    // Simple intent detection based on keywords
    if (text.includes('interested') || text.includes('tell me more') || text.includes('sounds good')) {
      this.leadClassification.interest = 'high';
      this.leadClassification.insights.push('Lead expressed explicit interest');
    } else if (text.includes('not interested') || text.includes('no thanks') || text.includes('stop calling')) {
      this.leadClassification.interest = 'none';
      this.leadClassification.insights.push('Lead explicitly declined interest');
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
  
  /**
   * Generate an appropriate AI response based on the conversation state
   */
  generateResponse(leadInput) {
    const text = leadInput.toLowerCase();
    
    // If the lead is not interested, acknowledge and wrap up
    if (this.leadClassification.interest === 'none') {
      return "I understand. Thank you for your time today. If you change your mind or have questions in the future, feel free to reach out. Have a great day!";
    }
    
    // If the lead is highly interested, move toward a conversion action
    if (this.leadClassification.interest === 'high') {
      return "That's great to hear! Based on what you've shared, I think our solution would be a good fit for your needs. Would you like to schedule a demo with one of our specialists? They can provide a more detailed walkthrough tailored to your specific requirements.";
    }
    
    // Handle price objections
    if (this.leadClassification.objections.includes('Price concern')) {
      return "I understand that budget is an important consideration. Our solution actually provides significant ROI by saving your sales team's time and increasing conversion rates. We also offer flexible pricing options based on your specific needs. Would you like me to have someone discuss custom pricing options with you?";
    }
    
    // Handle competitor objections
    if (this.leadClassification.objections.includes('Using competitor product')) {
      return "I understand you're currently using another solution. Many of our customers have switched to us because of our AI-powered lead qualification and outreach capabilities. What aspects of your current solution are you finding most challenging?";
    }
    
    // Handle follow-up requests
    if (this.leadClassification.needsFollowUp) {
      return "I understand this might not be the best time to talk. Would you prefer if we scheduled a follow-up call at a more convenient time? Or I could have one of our team members reach out via email with more information.";
    }
    
    // Default response to keep the conversation going
    return "Thank you for sharing that. Our AI-powered sales assistant helps businesses like yours increase efficiency and close more deals. Could you tell me a bit more about your current sales process so I can explain how we might help?";
  }
  
  /**
   * Update the lead insights in the database
   */
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
  
  /**
   * Calculate appropriate follow-up date (3 business days from now)
   */
  calculateFollowUpDate() {
    const date = new Date();
    
    // Add 3 business days
    let daysToAdd = 3;
    while (daysToAdd > 0) {
      date.setDate(date.getDate() + 1);
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        daysToAdd--;
      }
    }
    
    return date.toISOString();
  }
  
  /**
   * Add an AI response to the conversation history
   */
  trackAIResponse(response) {
    this.conversationHistory.push({
      role: 'ai',
      text: response,
      timestamp: new Date().toISOString()
    });
  }
}

export const aiCallAgent = new AICallAgent(); 
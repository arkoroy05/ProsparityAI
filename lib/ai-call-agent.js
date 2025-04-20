import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// SuperTeam Sales Specific Constants
const SALES_CONTEXT = {
  FREELANCER_QUESTIONS: [
    "Are you currently experiencing challenges finding reliable clients or managing project payments effectively?",
    "Do you frequently work on Solana-based projects or are you interested in exploring its potential?",
    "What is your current budget for freelance projects?",
    "What are your top priorities when selecting clients or managing projects?"
  ],
  CLIENT_QUESTIONS: [
    "Are you currently hiring freelancers for Solana projects?",
    "Are you satisfied with your current workflow and payment processing methods?",
    "Are you concerned about security and transparency in your freelance collaborations?",
    "What is your current budget for freelance projects?",
    "What are your top priorities when selecting a freelancer or managing a team?"
  ],
  BENEFITS: {
    FREELANCER: [
      "Secure payment processing on Solana blockchain",
      "Streamlined project management",
      "Access to wider client base",
      "Reduced transaction fees with Solana",
      "Enhanced visibility and reputation building"
    ],
    CLIENT: [
      "Efficient talent acquisition",
      "Secure payment systems on Solana",
      "Enhanced project visibility and control",
      "Reduced administrative overhead",
      "Improved transparency in collaboration"
    ]
  },
  OBJECTION_RESPONSES: {
    "too new": "SuperTeam is built on Solana, one of the fastest-growing blockchain ecosystems. We have numerous success stories of successful collaborations and secure transactions.",
    "too expensive": "Our platform actually reduces costs through Solana's minimal transaction fees and improved efficiency. The long-term savings in time and resources make it a cost-effective solution.",
    "existing system": "While your current system may work, SuperTeam offers unique advantages through Solana's blockchain technology, providing enhanced security, speed, and cost savings.",
    "need information": "I'd be happy to provide more details and schedule a follow-up call. We also have comprehensive documentation and case studies available."
  }
};

export class AICallAgent {
  constructor(leadId, taskId) {
    this.leadId = leadId;
    this.taskId = taskId;
    this.conversationHistory = [];
    this.retryCount = 0;
    this.leadClassification = {
      interest: null,
      objections: [],
      needsFollowUp: false,
      followUpDate: null,
      insights: [],
      leadType: null, // 'freelancer' or 'client'
      qualificationAnswers: {},
      currentStage: 'introduction' // introduction, qualification, presentation, objection_handling, closing
    };
  }

  async processSpeech(speechInput) {
    if (!speechInput) return;
    
    try {
      this.conversationHistory.push({
        role: 'lead',
        text: speechInput,
        timestamp: new Date().toISOString()
      });
      
      await this.analyzeLeadIntent(speechInput);
      
      const { data: leadData } = await supabase
        .from('leads')
        .select('*, companies (*)')
        .eq('id', this.leadId)
        .single();

      const { data: previousCalls } = await supabase
        .from('call_logs')
        .select('conversation, summary, sentiment')
        .eq('lead_id', this.leadId)
        .order('created_at', { ascending: false })
        .limit(3);

      const context = {
        leadInfo: leadData,
        companyInfo: leadData?.companies,
        currentClassification: this.leadClassification,
        conversationHistory: this.conversationHistory,
        previousCalls: previousCalls || [],
        currentObjective: this.getCallObjective(),
        salesContext: SALES_CONTEXT
      };

      const response = await this.generateContextualResponse(speechInput, context);
      this.trackAIResponse(response);
      await this.updateLeadInsights();
      this.retryCount = 0;
      
      return response;
    } catch (error) {
      console.error('Error processing lead speech:', error);
      return this.handleError(error);
    }
  }

  analyzeLeadIntent(speech) {
    const text = speech.toLowerCase();
    
    // Detect lead type
    if (text.includes('freelancer') || text.includes('looking for work') || text.includes('find clients')) {
      this.leadClassification.leadType = 'freelancer';
    } else if (text.includes('hiring') || text.includes('need developers') || text.includes('looking for talent')) {
      this.leadClassification.leadType = 'client';
    }

    // Detect stage progression
    if (this.leadClassification.currentStage === 'introduction') {
      if (text.includes('tell me more') || text.includes('interested') || text.includes('go ahead')) {
        this.leadClassification.currentStage = 'qualification';
      }
    } else if (this.leadClassification.currentStage === 'qualification') {
      if (Object.keys(this.leadClassification.qualificationAnswers).length >= 3) {
        this.leadClassification.currentStage = 'presentation';
      }
    }

    // Track qualification answers
    if (text.includes('budget')) {
      this.leadClassification.qualificationAnswers.budget = text;
    }
    if (text.includes('solana') || text.includes('blockchain')) {
      this.leadClassification.qualificationAnswers.blockchain_experience = text;
    }
    if (text.includes('priority') || text.includes('important')) {
      this.leadClassification.qualificationAnswers.priorities = text;
    }

    // Detect objections
    if (text.includes('new') || text.includes('risky')) {
      this.leadClassification.objections.push('too new');
      this.leadClassification.currentStage = 'objection_handling';
    }
    if (text.includes('expensive') || text.includes('cost')) {
      this.leadClassification.objections.push('too expensive');
      this.leadClassification.currentStage = 'objection_handling';
    }
    if (text.includes('already have') || text.includes('using')) {
      this.leadClassification.objections.push('existing system');
      this.leadClassification.currentStage = 'objection_handling';
    }
    if (text.includes('more information') || text.includes('learn more')) {
      this.leadClassification.objections.push('need information');
      this.leadClassification.currentStage = 'objection_handling';
    }

    // Update interest level
    if (text.includes('interested') || text.includes('sign up') || text.includes('start')) {
      this.leadClassification.interest = 'high';
      this.leadClassification.currentStage = 'closing';
    } else if (text.includes('not interested') || text.includes('no thanks')) {
      this.leadClassification.interest = 'none';
    } else if (text.includes('maybe') || text.includes('think about it')) {
      this.leadClassification.interest = 'medium';
    }

    // Track follow-up needs
    if (text.includes('later') || text.includes('another time')) {
      this.leadClassification.needsFollowUp = true;
      this.leadClassification.followUpDate = this.calculateFollowUpDate();
    }

    this.conversationHistory.push({
      role: 'system',
      text: `[Analysis: Lead Type: ${this.leadClassification.leadType || 'unknown'}, 
             Stage: ${this.leadClassification.currentStage},
             Interest: ${this.leadClassification.interest || 'unknown'},
             Objections: ${this.leadClassification.objections.join(', ') || 'none'}]`,
      timestamp: new Date().toISOString()
    });
  }

  async generateContextualResponse(userInput, context) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const prompt = `
      You are an AI sales agent for Prosparity.ai, specifically selling SuperTeam - a Solana ecosystem for freelancers.
      Your goal is to guide leads through the sales process naturally and professionally.

      Current Context:
      - Lead Type: ${context.currentClassification.leadType || 'Unknown'}
      - Sales Stage: ${context.currentClassification.currentStage}
      - Interest Level: ${context.currentClassification.interest || 'Unknown'}
      - Objections: ${context.currentClassification.objections.join(', ') || 'None'}
      
      Lead Information:
      - Name: ${context.leadInfo?.name || 'Unknown'}
      - Company: ${context.leadInfo?.company_name || 'Unknown'}
      
      Conversation History:
      ${this.formatConversationHistory(context.conversationHistory)}

      Stage-Specific Guidelines:
      ${this.getStagePurpose(context.currentClassification.currentStage, context.currentClassification.leadType)}

      Available Benefits to Highlight:
      ${context.currentClassification.leadType === 'freelancer' 
        ? SALES_CONTEXT.BENEFITS.FREELANCER.join('\n') 
        : SALES_CONTEXT.BENEFITS.CLIENT.join('\n')}

      Lead's Last Input: "${userInput}"

      Generate a natural, conversational response that:
      1. Matches the current sales stage
      2. Addresses any concerns or objections directly
      3. Moves the conversation forward appropriately
      4. Maintains a professional but friendly tone
      5. Is concise (2-3 sentences)
      
      Remember to:
      - Focus on Solana's benefits for secure, efficient collaboration
      - Address specific pain points based on lead type
      - Use questions strategically to gather information
      - Move naturally towards qualification and closing
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      return this.cleanResponse(response);
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.getFallbackResponse();
    }
  }

  getStagePurpose(stage, leadType) {
    const purposes = {
      introduction: "Introduce Prosparity.ai and SuperTeam, emphasizing our commitment to growth and success in the Solana ecosystem.",
      qualification: `Ask relevant qualifying questions for ${leadType}s:\n${
        leadType === 'freelancer' 
          ? SALES_CONTEXT.FREELANCER_QUESTIONS.join('\n')
          : SALES_CONTEXT.CLIENT_QUESTIONS.join('\n')
      }`,
      presentation: `Present SuperTeam benefits for ${leadType}s:\n${
        leadType === 'freelancer'
          ? SALES_CONTEXT.BENEFITS.FREELANCER.join('\n')
          : SALES_CONTEXT.BENEFITS.CLIENT.join('\n')
      }`,
      objection_handling: "Address objections using established responses while maintaining rapport.",
      closing: "Move towards commitment, offering appropriate next steps (direct signup, trial, or scheduled follow-up)."
    };
    return purposes[stage] || purposes.introduction;
  }

  formatConversationHistory(history) {
    if (!history || history.length === 0) return 'No previous conversation';
    
    return history
      .slice(-5) // Only use last 5 exchanges for context
      .map(entry => `${entry.role}: ${entry.text}`)
      .join('\n');
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
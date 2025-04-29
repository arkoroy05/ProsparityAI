import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store active call agents in memory
export const activeCallAgents = {};

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
      insights: []
    };
    this.customScript = null;
    this.aiSettings = null;
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  debug(...args) {
    if (this.debugMode) {
      console.log('[AICallAgent]', ...args);
    }
  }

  async initialize() {
    try {
      this.debug('Initializing AI agent for lead:', this.leadId);
      
      // Fetch company settings first
      const { data: companySettings, error: companyError } = await supabase
        .from('leads')
        .select(`
          company_id,
          companies (
            id,
            name,
            ai_instructions,
            settings
          )
        `)
        .eq('id', this.leadId)
        .single();

      if (companyError) {
        this.debug('Error fetching company settings:', companyError);
      } else if (companySettings?.companies) {
        this.debug('Loaded company settings:', {
          name: companySettings.companies.name,
          hasInstructions: !!companySettings.companies.ai_instructions
        });
        this.customScript = companySettings.companies.ai_instructions;
        this.aiSettings = companySettings.companies.settings;
      }

      // Fetch task-specific instructions if there's a task
      if (this.taskId) {
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', this.taskId)
          .single();

        if (!taskError && task) {
          this.debug('Found task-specific instructions:', !!task.ai_instructions);
          // Merge task instructions with company instructions
          this.customScript = task.ai_instructions 
            ? `${this.customScript || ''}\n\nTask-specific instructions:\n${task.ai_instructions}`
            : this.customScript;
        }
      }

      // Fetch lead's custom settings if any
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('ai_settings, additional_details')
        .eq('id', this.leadId)
        .single();

      if (!leadError && lead) {
        this.debug('Found lead-specific settings:', {
          hasAISettings: !!lead.ai_settings,
          hasAdditionalDetails: !!lead.additional_details
        });
        if (lead.ai_settings?.instructions) {
          this.customScript = `${this.customScript || ''}\n\nLead-specific instructions:\n${lead.ai_settings.instructions}`;
        }
      }

      this.debug('AI agent initialization complete:', {
        hasCustomScript: !!this.customScript,
        hasAISettings: !!this.aiSettings
      });
    } catch (error) {
      this.debug('Error initializing AI agent:', error);
      throw error;
    }
  }

  async processSpeech(speechInput) {
    if (!speechInput) return;
    
    try {
      this.debug('Processing speech input:', speechInput);
      
      // Initialize if not already done
      if (!this.customScript) {
        this.debug('No custom script loaded, initializing AI agent...');
        await this.initialize();
      }
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'lead',
        text: speechInput,
        timestamp: new Date().toISOString()
      });
      this.debug('Added speech to conversation history. History length:', this.conversationHistory.length);
      
      // Analyze speech for sentiment and intent
      this.debug('Analyzing speech intent...');
      await this.analyzeLeadIntent(speechInput);
      this.debug('Speech intent analysis complete:', {
        interest: this.leadClassification.interest,
        objections: this.leadClassification.objections,
        needsFollowUp: this.leadClassification.needsFollowUp
      });
      
      // Get lead context from database
      this.debug('Fetching lead context...');
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          companies (
            *,
            knowledge_base (*)
          )
        `)
        .eq('id', this.leadId)
        .single();
      
      if (leadError) {
        this.debug('Error fetching lead data:', leadError);
        throw leadError;
      }

      this.debug('Lead context loaded:', {
        leadName: leadData?.name,
        companyName: leadData?.companies?.name,
        hasKnowledgeBase: !!leadData?.companies?.knowledge_base
      });

      // Prepare context for response generation
      const context = {
        leadInfo: leadData,
        companyInfo: leadData?.companies,
        currentClassification: this.leadClassification,
        conversationHistory: this.conversationHistory,
        customScript: this.customScript,
        aiSettings: this.aiSettings
      };

      // Generate contextual response
      this.debug('Generating response with context:', context);
      const response = await this.generateContextualResponse(speechInput, context);
      
      // Track the response
      this.trackAIResponse(response);
      
      // Update lead classification in database
      await this.updateLeadInsights();

      // Reset retry count since we got a response
      this.retryCount = 0;
      
      return response;
    } catch (error) {
      this.debug('Error processing speech:', error);
      return this.handleError(error);
    }
  }

  async generateContextualResponse(userInput, context) {
    try {
      this.debug('Generating contextual response for input:', userInput);

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
      const prompt = `
      You are an AI sales agent having a conversation with a lead. Your goal is to qualify the lead and move them through the sales process naturally.
      
      ${context.customScript ? `Special Instructions:\n${context.customScript}\n` : ''}

      Current Context:
      - Lead Name: ${context.leadInfo?.name || 'Unknown'}
      - Company: ${context.leadInfo?.company_name || 'Unknown'}
      - Industry: ${context.leadInfo?.industry || 'Unknown'}
      - Current Interest Level: ${context.currentClassification.interest || 'Unknown'}
      - Identified Objections: ${context.currentClassification.objections.join(', ') || 'None'}
      - Follow-up Needed: ${context.currentClassification.needsFollowUp ? 'Yes' : 'No'}${context.currentClassification.followUpDate ? ` (${context.currentClassification.followUpDate})` : ''}
      - Call Objective: ${this.getCallObjective()}

      Previous Conversation:
      ${this.formatConversationHistory(context.conversationHistory)}

      Lead's Latest Response: "${userInput}"

      Instructions:
      1. Keep responses concise (2-3 sentences)
      2. Be natural and conversational
      3. Focus on the lead's specific situation
      4. Include a clear next step or question
      5. Show genuine interest in their needs
      6. Address any objections naturally
      7. Maintain context from the conversation
      8. Follow any special instructions provided
      9. Don't repeat previous responses
      10. If lead shows interest, work towards next steps

      Generate a response that moves the conversation forward while maintaining a natural flow.`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      this.debug('Generated response:', response);
      return this.cleanResponse(response);
    } catch (error) {
      this.debug('Error generating response:', error);
      return this.getFallbackResponse(context.currentClassification);
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

  handleError(error) {
    this.debug('AI Agent Error:', error);
    
    // Increment retry count
    this.retryCount++;
    
    if (this.retryCount >= 3) {
      return "I apologize, but I'm having trouble with our conversation. Let me have someone reach out to you directly. Thank you for your time.";
    }
    
    return "I apologize, but I didn't quite catch that. Could you please rephrase your response?";
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

  formatConversationHistory(history) {
    if (!history || history.length === 0) {
      return 'No previous conversation';
    }
    
    return history
      .slice(-5) // Only use last 5 exchanges for context
      .map(entry => `${entry.role}: ${entry.text}`)
      .join('\n');
  }

  async updateLeadInsights() {
    try {
      this.debug('Updating lead insights...');
      
      if (!this.leadId) {
        this.debug('No lead ID available, skipping insight update');
        return;
      }
      
      const { data: lead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', this.leadId)
        .single();
      
      if (fetchError) {
        this.debug('Error fetching lead for insight update:', fetchError);
        return;
      }
      
      const updateData = {
        ai_insights: {
          ...(lead.ai_insights || {}),
          classification: this.leadClassification,
          lastUpdated: new Date().toISOString()
        },
        last_contact_result: this.leadClassification.interest || 'unknown',
        needs_followup: this.leadClassification.needsFollowUp,
        followup_date: this.leadClassification.followUpDate,
        updated_at: new Date().toISOString()
      };

      this.debug('Updating lead with insights:', updateData);
      
      const { error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', this.leadId);
      
      if (updateError) {
        this.debug('Error updating lead insights:', updateError);
      } else {
        this.debug('Lead insights updated successfully');
      }
    } catch (error) {
      this.debug('Error in updateLeadInsights:', error);
    }
  }
  
  trackAIResponse(response) {
    this.conversationHistory.push({
      role: 'ai',
      text: response,
      timestamp: new Date().toISOString()
    });
    this.debug('Added AI response to conversation history');
  }
}
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
      this.debug('Updating lead insights in database');
      
      if (!this.leadId) {
        this.debug('No lead ID provided, skipping database update');
        return;
      }
      
      // Get the current lead data
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('metadata')
        .eq('id', this.leadId)
        .single();
      
      if (leadError) {
        this.debug('Error fetching lead data:', leadError);
        return;
      }
      
      // Prepare metadata with classifications
      const updatedMetadata = {
        ...(lead?.metadata || {}),
        classification: this.leadClassification,
        lastUpdated: new Date().toISOString()
      };
      
      // Update the lead record
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          metadata: updatedMetadata
        })
        .eq('id', this.leadId);
      
      if (updateError) {
        this.debug('Error updating lead insights:', updateError);
        return;
      }
      
      this.debug('Lead insights updated successfully');
      
      // If we have a task, update it too
      if (this.taskId) {
        await this.updateTaskWithInsights();
      }
    } catch (error) {
      this.debug('Error in updateLeadInsights:', error);
    }
  }
  
  async updateTaskWithInsights() {
    try {
      this.debug('Updating task with insights');
      
      if (!this.taskId) {
        return;
      }
      
      // Check if we need to follow up
      const needsFollowUp = this.leadClassification.needsFollowUp;
      let status = 'completed';
      
      if (needsFollowUp) {
        status = 'in-progress';
      }
      
      // Get the current task data
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('metadata, notes')
        .eq('id', this.taskId)
        .single();
      
      if (taskError) {
        this.debug('Error fetching task data:', taskError);
        return;
      }
      
      // Create a note about the call
      const callNote = {
        timestamp: new Date().toISOString(),
        type: 'ai-call',
        content: `AI call completed. Lead classification: ${this.leadClassification.interest || 'Not classified'} interest.`,
        insights: this.leadClassification
      };
      
      // Update task metadata
      const updatedMetadata = {
        ...(task?.metadata || {}),
        lastCallClassification: this.leadClassification,
        lastUpdated: new Date().toISOString()
      };
      
      // Add the note to existing notes
      const notes = Array.isArray(task?.notes) ? 
        [...task.notes, callNote] : [callNote];
      
      // Update the task record
      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          status: status,
          metadata: updatedMetadata,
          notes: notes
        })
        .eq('id', this.taskId);
      
      if (updateError) {
        this.debug('Error updating task with insights:', updateError);
        return;
      }
      
      this.debug('Task updated with insights successfully');
      
      // Create follow-up task if needed
      if (needsFollowUp && this.leadClassification.followUpDate) {
        await this.createFollowUpTask();
      }
    } catch (error) {
      this.debug('Error in updateTaskWithInsights:', error);
    }
  }
  
  async createFollowUpTask() {
    try {
      this.debug('Creating follow-up task');
      
      // Need lead info to get company ID
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('company_id')
        .eq('id', this.leadId)
        .single();
      
      if (leadError) {
        this.debug('Error fetching lead data for follow-up task:', leadError);
        return;
      }
      
      // Parse the follow-up date or default to tomorrow
      let followUpDate = new Date();
      try {
        followUpDate = new Date(this.leadClassification.followUpDate);
        if (isNaN(followUpDate.getTime())) {
          // If invalid date, set to tomorrow
          followUpDate = new Date();
          followUpDate.setDate(followUpDate.getDate() + 1);
        }
      } catch (e) {
        // Default to tomorrow if date parsing fails
        followUpDate.setDate(followUpDate.getDate() + 1);
      }
      
      // Get insights to use in follow-up instructions
      const insights = this.leadClassification.insights || [];
      const objections = this.leadClassification.objections || [];
      
      const followUpInstructions = `
      Follow-up from previous AI call.
      
      Previous insights:
      ${insights.join('\n')}
      
      Key objections to address:
      ${objections.length > 0 ? objections.join('\n') : 'None identified'}
      
      Lead interest level: ${this.leadClassification.interest || 'Unknown'}
      `;
      
      // Create follow-up task
      const { error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: `Follow up with lead based on AI call`,
          description: `Follow up on conversation points from previous AI call. Interest level: ${this.leadClassification.interest || 'Unknown'}`,
          task_type: 'call',
          status: 'pending',
          priority: this.getPriorityFromInterest(),
          scheduled_at: followUpDate.toISOString(),
          lead_id: this.leadId,
          company_id: lead.company_id,
          ai_instructions: followUpInstructions,
          metadata: {
            previousTaskId: this.taskId,
            previousClassification: this.leadClassification
          }
        });
      
      if (taskError) {
        this.debug('Error creating follow-up task:', taskError);
        return;
      }
      
      this.debug('Follow-up task created successfully');
    } catch (error) {
      this.debug('Error in createFollowUpTask:', error);
    }
  }
  
  getPriorityFromInterest() {
    // Map interest level to priority (1-5)
    switch (this.leadClassification.interest) {
      case 'high': return 5;
      case 'medium': return 4;
      case 'low': return 3;
      case 'none': return 1;
      default: return 3; // Default to medium priority
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

  async getInitialGreeting(leadName) {
    try {
      this.debug('Generating initial greeting');
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const companyInfo = await this.getCompanyInfo();
      
      const prompt = `
      Generate a professional and friendly initial greeting for a sales call.
      
      Context:
      - Lead Name: ${leadName || 'Unknown'}
      - Company: ${companyInfo?.name || 'Prosparity'}
      - You are calling from: ${companyInfo?.name || 'Prosparity'}, an AI-powered sales solution
      ${this.customScript ? `\nCustom Instructions:\n${this.customScript}` : ''}
      
      Guidelines:
      1. Keep it concise (1-2 sentences)
      2. Be friendly but professional
      3. Include the lead's name if provided
      4. Briefly mention the purpose of the call (improving business processes)
      5. Ask if they have a moment to talk
      6. Sound natural, not scripted
      
      Generate only the greeting text, nothing else.`;
      
      const result = await model.generateContent(prompt);
      const greeting = result.response.text();
      
      this.debug('Generated initial greeting:', greeting);
      return this.cleanResponse(greeting);
    } catch (error) {
      this.debug('Error generating initial greeting:', error);
      // Fallback greeting
      return leadName 
        ? `Hello ${leadName}, I'm calling from Prosparity. I'm calling to discuss how our AI-powered sales solution can help improve your business processes. Do you have a moment to talk?`
        : `Hello, I'm calling from Prosparity. I'm calling about improving your business processes. Do you have a moment to talk?`;
    }
  }

  async generateInsights(conversationHistory) {
    try {
      this.debug('Generating insights from conversation');
      
      if (!conversationHistory || conversationHistory.length < 2) {
        return {
          leadClassification: this.leadClassification,
          summary: "Insufficient conversation data to generate meaningful insights.",
          nextSteps: ["Follow up with the lead to gather more information."]
        };
      }
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Format conversation for analysis
      const conversationText = conversationHistory.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.text}`
      ).join('\n\n');
      
      const prompt = `
      Analyze this sales call conversation and generate insights.
      
      Conversation:
      ${conversationText}
      
      Generate the following insights:
      1. Lead Classification:
         - Interest level (high, medium, low, none)
         - Key objections (list)
         - Needs follow-up (yes/no)
         - Recommended follow-up date (if needed)
         
      2. Conversation Summary:
         - A concise summary of the main points discussed
         - Key pain points mentioned by the lead
         - Value propositions that resonated
         
      3. Next Steps:
         - Specific action items for following up
         - Questions to ask in the next conversation
         - Resources to send to the lead
         
      4. Additional Insights:
         - Sentiment of the lead (positive, neutral, negative)
         - Decision-making stage (researching, evaluating, deciding)
         - Budget indicators
         - Competitive mentions
         
      Format your response as a JSON object with these fields.`;
      
      const result = await model.generateContent(prompt);
      const insightsText = result.response.text();
      
      // Parse JSON from response
      const insightsMatch = insightsText.match(/```(json)?\s*({[\s\S]*})\s*```/);
      const insightsJson = insightsMatch ? insightsMatch[2] : insightsText;
      
      try {
        const insights = JSON.parse(insightsJson.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
        this.debug('Generated insights:', insights);
        
        // Update lead classification
        if (insights.leadClassification) {
          this.leadClassification = {
            ...this.leadClassification,
            ...insights.leadClassification
          };
        }
        
        return insights;
      } catch (jsonError) {
        this.debug('Error parsing insights JSON:', jsonError);
        // Return structured format even with parsing error
        return {
          leadClassification: this.leadClassification,
          summary: "Conversation analysis complete but format error occurred.",
          nextSteps: ["Review the conversation manually."],
          error: "JSON parsing error"
        };
      }
    } catch (error) {
      this.debug('Error generating insights:', error);
      return {
        leadClassification: this.leadClassification,
        summary: "Error generating insights from conversation.",
        nextSteps: ["Review the conversation manually."],
        error: error.message
      };
    }
  }
  
  async getCompanyInfo() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          company_id,
          companies (
            id,
            name,
            industry,
            description
          )
        `)
        .eq('id', this.leadId)
        .single();
      
      if (error) throw error;
      return data?.companies || null;
    } catch (error) {
      this.debug('Error fetching company info:', error);
      return null;
    }
  }

  async analyzeLeadIntent(speechInput) {
    try {
      this.debug('Analyzing lead intent for:', speechInput);
      
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      Analyze the following speech input from a sales call lead, and classify their intent and sentiment.

      Lead's response: "${speechInput}"
      
      Previous classification: ${JSON.stringify(this.leadClassification)}

      Return a JSON object with the following fields:
      {
        "interest": "high" | "medium" | "low" | "none", // Based on how interested they sound
        "objections": [], // Array of specific objections raised (like price, timing, need, etc.)
        "needsFollowUp": true | false, // Whether the lead needs follow-up
        "followUpDate": null | "date string", // Recommended follow-up date if needed
        "insights": [] // Array of key insights from this response
      }

      Only return the JSON object, nothing else.
      `;
      
      const result = await model.generateContent(prompt);
      const analysisText = result.response.text();
      
      // Parse JSON from response
      const analysisMatch = analysisText.match(/```(json)?\s*({[\s\S]*})\s*```/);
      const analysisJson = analysisMatch ? analysisMatch[2] : analysisText;
      
      try {
        const analysis = JSON.parse(analysisJson.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
        this.debug('Intent analysis result:', analysis);
        
        // Update lead classification with new analysis
        // Keep existing values if the new analysis doesn't provide them
        this.leadClassification = {
          interest: analysis.interest || this.leadClassification.interest,
          objections: [
            ...new Set([
              ...(this.leadClassification.objections || []),
              ...(analysis.objections || [])
            ])
          ],
          needsFollowUp: analysis.needsFollowUp !== undefined ? 
            analysis.needsFollowUp : this.leadClassification.needsFollowUp,
          followUpDate: analysis.followUpDate || this.leadClassification.followUpDate,
          insights: [
            ...(this.leadClassification.insights || []),
            ...(analysis.insights || [])
          ]
        };
        
        return this.leadClassification;
      } catch (jsonError) {
        this.debug('Error parsing lead intent JSON:', jsonError);
        return this.leadClassification;
      }
    } catch (error) {
      this.debug('Error analyzing lead intent:', error);
      return this.leadClassification;
    }
  }
}
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store active call agents in memory
export const activeCallAgents = {};

export class AICallAgent {
  constructor(leadId, taskId) {
    if (!leadId) throw new Error('leadId is required');
    
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
    this.isInitialized = false;
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

      // Verify that we have the minimum required information
      if (!this.customScript) {
        this.customScript = 'Use a professional and friendly tone. Be concise and clear in your responses.';
        this.debug('Using default script due to missing custom script');
      }

      // Initialize the AI model
      try {
        this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
        if (!this.model) {
          throw new Error('Failed to initialize Gemini AI model');
        }
      } catch (modelError) {
        this.debug('Error initializing AI model:', modelError);
        throw modelError;
      }

      this.isInitialized = true;
      this.debug('AI agent initialization complete:', {
        hasCustomScript: !!this.customScript,
        hasAISettings: !!this.aiSettings,
        isInitialized: this.isInitialized
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
      if (!this.isInitialized) {
        throw new Error('AI agent not initialized');
      }

      this.debug('Generating initial greeting for:', leadName);

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      You are an AI sales agent making an initial call. Generate a natural, friendly greeting for ${leadName || 'a potential customer'}.
      
      Requirements:
      1. Keep it brief (1-2 sentences)
      2. Be professional and courteous
      3. Mention Prosparity
      4. Ask if they have a moment to talk
      ${this.customScript ? `\nSpecial Instructions:\n${this.customScript}` : ''}
      
      Generate a natural greeting that doesn't sound scripted.`;

      const result = await model.generateContent(prompt);
      const greeting = this.cleanResponse(result.response.text());
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'agent',
        text: greeting,
        timestamp: new Date().toISOString()
      });
      
      this.debug('Generated greeting:', greeting);
      return greeting;
    } catch (error) {
      this.debug('Error generating greeting:', error);
      // Return null to let the caller handle the fallback
      return null;
    }
  }

  async generateInsights(conversationHistory) {
    try {
      if (!this.isInitialized || !conversationHistory?.length) {
        throw new Error('AI agent not initialized or no conversation history');
      }

      this.debug('Generating insights from conversation history');

      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
      Analyze this sales call conversation and generate insights.

      Conversation History:
      ${this.formatConversationHistory(conversationHistory)}

      Generate a structured analysis with:
      1. Lead interest level (high/medium/low)
      2. Key objections identified
      3. Next steps recommended
      4. Whether follow-up is needed
      5. Important insights about the lead's needs
      6. Any red flags or concerns

      Return the analysis in a clean JSON format.`;

      const result = await model.generateContent(prompt);
      const analysisText = result.response.text();
      
      // Parse the JSON response
      const analysis = JSON.parse(this.cleanJsonString(analysisText));
      
      // Update lead classification
      this.leadClassification = {
        interest: analysis.interestLevel?.toLowerCase() || null,
        objections: analysis.keyObjections || [],
        needsFollowUp: analysis.followUpNeeded || false,
        followUpDate: analysis.followUpDate || null,
        insights: analysis.insights || []
      };
      
      this.debug('Generated insights:', analysis);
      return analysis;
    } catch (error) {
      this.debug('Error generating insights:', error);
      return {
        error: "Failed to generate insights",
        partialData: this.leadClassification
      };
    }
  }

  cleanJsonString(str) {
    // Remove any text before the first {
    const jsonStart = str.indexOf('{');
    if (jsonStart === -1) return str;
    str = str.substring(jsonStart);
    
    // Remove any text after the last }
    const jsonEnd = str.lastIndexOf('}');
    if (jsonEnd === -1) return str;
    str = str.substring(0, jsonEnd + 1);
    
    return str;
  }

  formatConversationHistory(history) {
    if (!history?.length) return "No conversation history";
    return history.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.text}`
    ).join('\n');
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
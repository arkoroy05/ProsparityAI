import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
if (!genAI) {
  throw new Error('Failed to initialize Google Generative AI client');
}

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

      // Initialize and test the AI model
      try {
        this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
        if (!this.model) {
          throw new Error('Failed to initialize Gemini AI model');
        }
        
        // Test the model with a simple prompt to ensure it's working
        const testResult = await this.model.generateContent('Respond with "OK" if you can understand this.');
        const testResponse = testResult.response.text();
        if (!testResponse || !testResponse.includes('OK')) {
          throw new Error('AI model failed basic communication test');
        }
        
        this.debug('AI model initialized and tested successfully');
      } catch (modelError) {
        this.debug('Error initializing AI model:', modelError);
        throw new Error(`AI model initialization failed: ${modelError.message}`);
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

      if (!this.model || !this.isInitialized) {
        throw new Error('AI model not properly initialized');
      }
    
      // Fetch AI Instructions from the company settings
      let aiPersona = '';
      if (context.companyInfo?.ai_instructions) {
        this.debug('Using company-specific AI instructions');
        aiPersona = context.companyInfo.ai_instructions;
      } else if (context.aiSettings?.persona) {
        this.debug('Using AI settings persona');
        aiPersona = context.aiSettings.persona;
      } else {
        this.debug('Using default AI persona');
        aiPersona = `You are a professional sales agent from Prosparity having a real-time phone conversation.
        Your goal is to qualify the lead and guide them through a natural sales conversation.

        KEY REQUIREMENTS:
        1. Keep responses brief and conversational (2-3 sentences max)
        2. Sound natural and human-like, not robotic
        3. Listen and respond to what the lead is saying
        4. Ask one clear question at a time
        5. Handle objections professionally
        6. Never mention that you are an AI`;
      }

      const prompt = `
      ${aiPersona}
      
      CONVERSATION CONTEXT:
      - Lead Name: ${context.leadInfo?.name || 'Unknown'}
      - Company: ${context.leadInfo?.company_name || 'Unknown'}
      - Industry: ${context.leadInfo?.industry || 'Unknown'}
      - Previous Interest Level: ${context.currentClassification?.interest || 'Unknown'}
      - Identified Objections: ${context.currentClassification?.objections?.join(', ') || 'None'}
      
      ${context.customScript ? `CUSTOM INSTRUCTIONS:\n${context.customScript}\n` : ''}

      CONVERSATION CONTEXT AND HISTORY:
      ${this.formatConversationHistory(context.conversationHistory)}

      CURRENT OBJECTIVE: ${this.getCallObjective()}

      KNOWLEDGE BASE FACTS:
      ${this.formatKnowledgeBase(context.companyInfo?.knowledge_base)}

      LEAD'S LATEST INPUT: "${userInput}"

      RESPONSE GUIDELINES:
      1. Sound natural and conversational
      2. Keep response under 15 seconds of speech
      3. Address the lead's specific input
      4. Use active listening techniques
      5. If they show interest, guide towards next steps
      6. If they raise objections, address them professionally
      7. Ask relevant follow-up questions
      8. Never say "As an AI" or mention being AI
      9. Avoid repeating yourself
      10. Keep the conversation flowing naturally
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

      Generate a natural, conversational response that keeps the call moving forward.
      
      Response format example (for reference only):
      "I understand your concern about [point they raised]. [Brief value proposition]. What are your thoughts on [relevant follow-up question]?"
      `;

      // Generate with smart retries
      const maxRetries = 2;
      let retryCount = 0;
      let response = null;

      while (!response && retryCount < maxRetries) {
        try {
          // Add system message using the dynamic persona
          let systemPrompt = "You are a professional sales agent. ";
          if (context.companyInfo?.ai_instructions) {
            const personaMatch = context.companyInfo.ai_instructions.match(/you are ([^.]+)/i);
            if (personaMatch) {
              systemPrompt = `You are ${personaMatch[1]}. `;
            }
          }
          systemPrompt += "Respond naturally as if in a real phone conversation. Keep responses brief and focused.";

          const chat = this.model.startChat({
            history: [
              {
                role: "user",
                parts: systemPrompt
              },
              {
                role: "model",
                parts: "I understand. I'll engage naturally in that role, keeping responses conversational and concise."
              }
            ],
          });

          const result = await chat.sendMessage(prompt);
          const generatedText = result.response.text();
          
          this.debug('Raw AI response:', generatedText);
          
          const cleanedResponse = this.cleanResponse(generatedText);
          if (!cleanedResponse) {
            throw new Error('Failed to clean AI response');
          }
          
          // Validate the response
          if (!this.validateResponse(cleanedResponse)) {
            throw new Error('Generated response failed validation');
          }
          
          response = cleanedResponse;
          this.debug('Generated valid response:', response);
          
          // Add to conversation history
          this.conversationHistory.push({
            role: 'agent',
            text: response,
            timestamp: new Date().toISOString()
          });
          
          // Update success metrics
          this.successfulResponses = (this.successfulResponses || 0) + 1;
          
          return response;
        } catch (retryError) {
          retryCount++;
          this.debug(`Response generation attempt ${retryCount} failed:`, retryError);
          
          // Analyze the error and adjust prompt if needed
          if (retryError.message.includes('Failed to clean')) {
            // Try with a more structured prompt
            prompt = `${prompt}\n\nREMINDER: Respond in a single, clear statement that a sales agent would say.`;
          } else if (retryError.message.includes('validation')) {
            // Try with more specific guidance
            prompt = `${prompt}\n\nIMPORTANT: Respond with a complete, natural sentence that directly addresses the lead's last input.`;
          }
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to generate valid response after ${maxRetries} attempts: ${retryError.message}`);
          }
          
          // Exponential backoff delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
    } catch (error) {
      this.debug('Error generating response:', error);
      throw error; // Let the caller handle the error
    }
  }

  cleanResponse(response) {
    if (!response) return null;

    try {
      // Extract the actual response content
      const responseMatch = response.match(/^(?:"([^"]+)"|'([^']+)'|([^"']+))$/);
      if (responseMatch) {
        response = responseMatch[1] || responseMatch[2] || responseMatch[3];
      }

      // Remove any AI/system indicators
      response = response
        .replace(/^(AI|Assistant|Response|Agent|Sarah):\s*/i, '')
        .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/\[.*?\]/g, '') // Remove square brackets
        .replace(/\(.*?\)/g, '') // Remove parentheses
        .replace(/\n+/g, ' ') // Replace newlines
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

      // Check for AI/system-like phrases
      const systemPhrases = [
        'as an ai',
        'as a language model',
        'as an assistant',
        'i apologize',
        'i am unable',
        'i cannot',
        'i am not able',
      ];

      if (systemPhrases.some(phrase => response.toLowerCase().includes(phrase))) {
        throw new Error('Response contains AI/system phrases');
      }

      // Ensure proper length
      if (response.length < 10) {
        throw new Error('Response too short');
      }
      if (response.length > 150) { // Reduced max length for more natural responses
        response = response.substring(0, 147) + '...';
      }

      // Ensure proper sentence structure
      if (!response.match(/^[A-Z]/) || !response.match(/[.!?]$/)) {
        throw new Error('Response missing proper sentence structure');
      }

      // Additional validation for natural conversation
      if (response.includes('JSON') || response.includes('```') || response.includes('</')) {
        throw new Error('Response contains technical content');
      }

      return response;
    } catch (error) {
      this.debug('Error cleaning response:', error);
      throw new Error(`Failed to clean response: ${error.message}`);
    }
  }

  validateResponse(response) {
    if (!response) return false;
    
    // Check for proper length (neither too short nor too long)
    if (response.length < 10 || response.length > 150) return false;
    
    // Check for proper sentence structure
    if (!response.match(/^[A-Z]/) || !response.match(/[.!?]$/)) return false;
    
    // Check for conversational nature
    const nonConversationalIndicators = [
      'error',
      'failed',
      'undefined',
      'null',
      'invalid',
      '{',
      '}',
      'function',
      'ai',
      'assistant',
      'model',
      'sorry',
      'apologize',
      'cannot',
      'unable'
    ];
    
    if (nonConversationalIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    )) {
      return false;
    }
    
    // Check for proper question structure if it ends with "?"
    if (response.endsWith('?') && !response.includes(' you ') && !response.includes('your')) {
      return false;
    }
    
    // Check for natural conversation flow
    const naturalFlowIndicators = [
      'you',
      'your',
      'we',
      'our',
      'I',
      'me',
      'my',
      'let',
      'tell',
      'share',
      'help',
      'what',
      'how',
      'when',
      'why',
      'could',
      'would'
    ];
    
    const hasNaturalFlow = naturalFlowIndicators.some(indicator => 
      response.toLowerCase().includes(indicator)
    );
    
    if (!hasNaturalFlow) return false;
    
    return true;
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
        this.debug('AI agent not initialized, attempting initialization');
        await this.initialize();
      }

      if (!this.model) {
        throw new Error('AI model not properly initialized');
      }

      this.debug('Generating initial greeting for:', leadName);
      
      // Get company data to fetch AI instructions
      const { data: companyData, error: companyError } = await supabase
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

      // Determine the greeting instructions
      let greetingInstructions = '';
      if (companyData?.companies?.ai_instructions) {
        const aiInstructions = companyData.companies.ai_instructions;
        if (aiInstructions.includes('GREETING:')) {
          // Extract specific greeting instructions if available
          const greetingMatch = aiInstructions.match(/GREETING:\s*((?:[^\n]|\n(?!\n))*)/);
          greetingInstructions = greetingMatch ? greetingMatch[1] : aiInstructions;
        } else {
          greetingInstructions = aiInstructions;
        }
      }

      const prompt = `
      ${greetingInstructions || `Generate a natural, friendly greeting for ${leadName || 'a potential customer'}.`}
      
      Context:
      - You are calling from ${companyData?.companies?.name || 'Prosparity'}
      - Keep the tone professional but warm
      - Ask if they have a moment to talk
      ${this.customScript ? `\nSpecial Instructions:\n${this.customScript}` : ''}
      
      Requirements:
      1. Keep it brief (2-3 sentences)
      2. Sound natural and conversational
      3. Include the lead's name if provided
      4. Clearly identify yourself and the company
      5. Ask for their time politely
      
      Example format (do not copy exactly):
      "Hi [name], this is [agent name] from Prosparity. I'm reaching out today because [brief reason]. Do you have a moment to chat?"
      
      Generate a natural, conversational greeting that follows these requirements.`;

      const result = await this.model.generateContent(prompt);
      if (!result || !result.response) {
        throw new Error('Failed to generate greeting from AI model');
      }

      const greeting = this.cleanResponse(result.response.text());
      if (!greeting || greeting.length < 10) {
        throw new Error('Generated greeting is too short or empty');
      }

      // Validate the greeting contains required elements
      if (!greeting.toLowerCase().includes('prosparity')) {
        throw new Error('Generated greeting missing company name');
      }

      if (leadName && !greeting.toLowerCase().includes(leadName.toLowerCase())) {
        throw new Error('Generated greeting missing lead name');
      }

      // Add to conversation history
      this.conversationHistory.push({
        role: 'agent',
        text: greeting,
        timestamp: new Date().toISOString()
      });
      
      this.debug('Successfully generated greeting:', greeting);
      return greeting;
    } catch (error) {
      this.debug('Error in getInitialGreeting:', error);
      // Instead of returning null, throw the error to handle it properly
      throw error;
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

  formatKnowledgeBase(knowledgeBase) {
    if (!knowledgeBase || !Array.isArray(knowledgeBase)) {
      return 'No specific product knowledge available.';
    }

    // Filter for most relevant knowledge items and format them
    const relevantItems = knowledgeBase
      .filter(item => item.priority === 'high' || item.is_key_point)
      .slice(0, 5); // Limit to top 5 most relevant items

    if (relevantItems.length === 0) {
      return 'Use standard product knowledge.';
    }

    return relevantItems
      .map(item => `- ${item.title}: ${item.content}`)
      .join('\n');
  }
}
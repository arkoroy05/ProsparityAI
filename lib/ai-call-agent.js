import { supabase } from './supabase';

// Import geminiAI and getAvailableModel from gemini-ai.js
import geminiAI, { getAvailableModel } from './gemini-ai';

// Store active call agents in memory
export const activeCallAgents = {};

// Default AI persona instructions for Prosparity.ai
const DEFAULT_PROSPARITY_INSTRUCTIONS = `
## Prosparity.ai Sales Agent Instructions
**Objective:** To generate qualified leads and book meetings for Prosparity.ai by conducting outbound sales calls.

**1. Introduction and Greeting:**
* **Start with a personalized greeting:** "Hi [Prospect Name], this is [AI Agent Name] calling from Prosparity.ai." Always use the prospect's name if available.
* **Briefly state your purpose:** "I'm calling today to discuss how Prosparity.ai can help [mention their industry/company size, if known] improve sales performance and lead conversion through our AI-powered platform."
* **Keep it concise and engaging:** Aim for a 10-15 second introduction. Avoid lengthy monologues.

**2. Company Value Proposition:**
* **Focus on benefits:** "Our AI-powered sales platform helps businesses automate outreach, qualify leads more effectively, and increase conversion rates by 30% on average."
* **Highlight key differentiators:** "What makes Prosparity unique is our advanced AI that can conduct natural conversations with leads, freeing up your sales team to focus on closing deals."
* **Tailor the value proposition:** Use information about the prospect's industry and challenges to customize your message.

**3. Qualifying Questions:**
* **Current sales process:** "Could you tell me about your current sales process and how you're generating and qualifying leads?"
* **Pain points:** "What are the biggest challenges your sales team is facing right now?"
* **Team size:** "How large is your sales team, and how are they currently handling lead qualification?"
* **Goals:** "What are your sales goals for the next quarter or year?"
* **Decision making:** "Who is typically involved in decisions about sales tools and processes?"

**4. Handling Common Objections:**
* **Cost concerns:** "While there is an investment, our clients typically see ROI within the first 3 months through increased conversion rates and sales team efficiency."
* **Integration worries:** "Our platform integrates seamlessly with most CRM systems including Salesforce, HubSpot, and Zoho."
* **AI skepticism:** "Our AI has been trained on thousands of successful sales conversations and continuously improves. It's designed to complement your sales team, not replace them."
* **Implementation time:** "Most clients are up and running within 2 weeks, and our customer success team provides full support throughout the process."

**5. Call Flow and Structure:**
1. Introduction & Greeting (10-15 seconds)
2. Value Proposition (30-45 seconds)
3. Qualifying Questions (1-2 minutes)
4. Address Objections (as needed)
5. Next Steps & Call to Action (30 seconds)

**6. Closing and Next Steps:**
* **For interested prospects:** "Based on our conversation, I think Prosparity could really help with [specific pain point mentioned]. Would you be interested in seeing a demo of how our platform works?"
* **For hesitant prospects:** "I understand you need some time to think about this. Would it be helpful if I sent you some case studies from companies in your industry who've seen success with our platform?"
* **For not interested:** "I appreciate your time today. Would it be alright if I check back in a few months to see if your needs have changed?"
`;

export class AICallAgent {
  constructor(leadId, taskId) {
    if (!leadId) throw new Error('leadId is required');

    this.leadId = leadId;
    this.taskId = taskId;
    this.conversationHistory = [];
    this.retryCount = 0;
    this.maxRetries = 3;
    this.leadClassification = {
      interest: null,
      objections: [],
      needsFollowUp: false,
      followUpDate: null,
      insights: []
    };
    this.customScript = DEFAULT_PROSPARITY_INSTRUCTIONS; // Set default to Prosparity instructions
    this.aiSettings = null;
    this.isInitialized = false;
    this.debugMode = true; // Always enable debug mode for better troubleshooting
    this.initializationAttempts = 0;
    this.maxInitAttempts = 3;
    this.modelInitialized = false;
    this.defaultPrompt = DEFAULT_PROSPARITY_INSTRUCTIONS;
    this.companyName = "Prosparity.ai"; // Default company name
  }

  debug(...args) {
    if (this.debugMode) {
      console.log('[AICallAgent]', ...args);
    }
  }

  async initialize() {
    try {
      if (this.initializationAttempts >= this.maxInitAttempts) {
        throw new Error('Maximum initialization attempts reached');
      }

      this.initializationAttempts++;
      this.debug('Initializing AI agent for lead:', this.leadId, 'Attempt:', this.initializationAttempts);

      // Initialize AI model first
      try {
        this.model = await getAvailableModel();
        this.modelInitialized = true;
        this.debug('AI model initialized successfully');
      } catch (modelError) {
        this.debug('Error initializing AI model:', modelError);
        throw new Error(`AI model initialization failed: ${modelError.message}`);
      }

      // Try to fetch company settings, but don't fail initialization if this fails
      try {
        // First get the company_id from the lead
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('company_id, name, company_name')
          .eq('id', this.leadId)
          .single();

        if (leadError) {
          this.debug('Error fetching lead data:', leadError);
        } else if (leadData?.company_id) {
          this.debug('Found company_id for lead:', leadData.company_id);

          // Now fetch company settings using the company_id
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', leadData.company_id)
            .single();

          if (!companyError && companyData) {
            this.debug('Found company:', companyData.name);
            this.companyName = companyData.name; // Store the company name

            // Check for company settings
            const { data: settingsData, error: settingsError } = await supabase
              .from('company_settings')
              .select('ai_instructions, call_settings')
              .eq('company_id', leadData.company_id)
              .single();

            if (!settingsError && settingsData) {
              this.debug('Found company settings with AI instructions:', !!settingsData.ai_instructions);

              if (settingsData.ai_instructions) {
                this.customScript = settingsData.ai_instructions;
                this.debug('Using company-specific AI instructions');
              }

              if (settingsData.call_settings) {
                this.aiSettings = settingsData.call_settings;
              }
            } else {
              // If no company settings found, try to get Prosparity.ai settings as fallback
              this.debug('No company settings found, trying to get Prosparity.ai settings');

              const { data: prospSettings, error: prospError } = await supabase
                .from('company_settings')
                .select('ai_instructions')
                .eq('company_id', '5fc4e5a4-28f9-4f32-b6b3-ee6ff93eccb7') // Prosparity.ai company ID
                .single();

              if (!prospError && prospSettings?.ai_instructions) {
                this.debug('Using Prosparity.ai settings as fallback');
                this.customScript = prospSettings.ai_instructions;
              }
            }
          }
        }
      } catch (error) {
        this.debug('Error fetching company settings, continuing with defaults:', error);
      }

      // Try to load task-specific instructions
      try {
        if (this.taskId) {
          const { data: task, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', this.taskId)
            .single();

          if (!taskError && task?.ai_instructions) {
            this.debug('Found task-specific instructions');
            this.customScript = this.customScript ?
              `${this.customScript}\n\nTask-specific instructions:\n${task.ai_instructions}` :
              task.ai_instructions;
          }
        }
      } catch (error) {
        this.debug('Error fetching task data, continuing with defaults:', error);
      }

      // Try to load lead-specific settings
      try {
        const { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('ai_settings, additional_details')
          .eq('id', this.leadId)
          .single();

        if (!leadError && lead?.ai_settings?.instructions) {
          this.debug('Found lead-specific settings');
          this.customScript = this.customScript ?
            `${this.customScript}\n\nLead-specific instructions:\n${lead.ai_settings.instructions}` :
            lead.ai_settings.instructions;
        }
      } catch (error) {
        this.debug('Error fetching lead settings, continuing with defaults:', error);
      }

      // If no custom script was loaded, make sure we use the default
      if (!this.customScript) {
        this.customScript = DEFAULT_PROSPARITY_INSTRUCTIONS;
        this.debug('Using default Prosparity.ai instructions script');
      }

      // Test the AI setup
      try {
        const testResult = await this.model.generateContent('Respond with "OK" if you can understand this.');
        const testResponse = await testResult.response.text();
        if (!testResponse || !testResponse.includes('OK')) {
          throw new Error('AI model failed basic communication test');
        }
        this.debug('AI model tested successfully');
      } catch (testError) {
        this.debug('AI model test failed:', testError);
        throw new Error(`AI model test failed: ${testError.message}`);
      }

      this.isInitialized = true;
      this.debug('AI agent initialization complete', {
        hasCustomScript: !!this.customScript,
        hasAISettings: !!this.aiSettings,
        initializationAttempts: this.initializationAttempts
      });

    } catch (error) {
      this.debug('Error in initialization:', error);

      // If model is initialized but other parts failed, we can still continue with default settings
      if (this.modelInitialized) {
        this.debug('Continuing with default settings because model was initialized');
        this.customScript = DEFAULT_PROSPARITY_INSTRUCTIONS;
        this.isInitialized = true;
        return;
      }

      // If we haven't hit max attempts, try again with exponential backoff
      if (this.initializationAttempts < this.maxInitAttempts) {
        const backoffTime = Math.pow(2, this.initializationAttempts) * 1000;
        this.debug(`Retrying initialization in ${backoffTime}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.initialize();
      }

      throw error;
    }
  }

  async processSpeech(speechInput) {
    if (!speechInput) {
      return "I'm sorry, I didn't catch that. Could you please repeat?";
    }

    try {
      this.debug('Processing speech input:', speechInput);

      // Initialize if not already done
      if (!this.isInitialized) {
        this.debug('AI agent not initialized, initializing now...');
        await this.initialize();
        if (!this.isInitialized) {
          throw new Error('Failed to initialize AI agent');
        }
      }

      // Add to conversation history
      this.conversationHistory.push({
        role: 'lead',
        text: speechInput,
        timestamp: new Date().toISOString()
      });
      this.debug('Added speech to conversation history. History length:', this.conversationHistory.length);

      // Analyze speech for sentiment and intent - but don't block the response if this fails
      try {
        this.debug('Analyzing speech intent...');
        await this.analyzeLeadIntent(speechInput);
        this.debug('Speech intent analysis complete:', {
          interest: this.leadClassification.interest,
          objections: this.leadClassification.objections,
          needsFollowUp: this.leadClassification.needsFollowUp
        });
      } catch (intentError) {
        this.debug('Intent analysis failed, but continuing with response generation:', intentError);
        // Don't throw, just continue with response generation
      }

      // Get lead context from database
      this.debug('Fetching lead context...');
      let leadData;
      try {
        const { data, error } = await supabase
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

        if (error) {
          this.debug('Error fetching lead data:', error);
          // Don't throw, use what we have
        } else {
          leadData = data;
          this.debug('Lead context loaded:', {
            leadName: leadData?.name,
            companyName: leadData?.companies?.name,
            hasKnowledgeBase: !!leadData?.companies?.knowledge_base
          });
        }
      } catch (dbError) {
        this.debug('Database error when fetching lead data:', dbError);
        // Don't throw, use what we have
      }

      // Prepare context for response generation - use what we have even if some parts failed
      const context = {
        leadInfo: leadData || {},
        companyInfo: leadData?.companies || {},
        currentClassification: this.leadClassification,
        conversationHistory: this.conversationHistory,
        customScript: this.customScript || DEFAULT_PROSPARITY_INSTRUCTIONS,
        aiSettings: this.aiSettings
      };

      // Generate contextual response with multiple retries
      this.debug('Generating response with context');
      let response = null;

      // Try up to 3 times to get a valid response
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await this.generateContextualResponse(speechInput, context);
          if (response) break; // Exit loop if we got a valid response
        } catch (genError) {
          // Log the error and continue with retry
          this.debug(`Response generation attempt ${attempt + 1} failed:`, genError);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // If all attempts failed, use a fallback response
      if (!response) {
        this.debug('All response generation attempts failed, using fallback');

        // Check if we can determine what the user was asking about
        const userInput = speechInput.toLowerCase();
        if (userInput.includes('price') || userInput.includes('cost') || userInput.includes('how much')) {
          response = "I'd be happy to discuss pricing options. Our plans are customized based on your specific needs. Could you tell me a bit more about your business requirements so I can provide the most accurate information?";
        } else if (userInput.includes('demo') || userInput.includes('try') || userInput.includes('see it')) {
          response = "I'd be glad to arrange a demo for you. Could I get your email address to schedule a time with one of our product specialists?";
        } else if (userInput.includes('no') || userInput.includes('not interested') || userInput.includes('busy')) {
          response = "I understand. Would it be better if I reached out at another time? Or perhaps I could send you some information via email instead?";
        } else {
          // Generic fallback
          response = "I appreciate your input. To better assist you, could you tell me more about your current business challenges?";
        }
      }

      // Track the response
      this.trackAIResponse(response);

      // Update lead classification in database - don't block if this fails
      try {
        await this.updateLeadInsights();
      } catch (updateError) {
        this.debug('Failed to update lead insights, but continuing:', updateError);
      }

      // Reset retry count since we got a response
      this.retryCount = 0;

      return response;
    } catch (error) {
      this.debug('Critical error processing speech:', error);
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
        const companyName = this.companyName || 'Prosparity.ai';
        this.debug('Using default AI persona with company name:', companyName);
        aiPersona = `You are a professional sales agent from ${companyName} having a real-time phone conversation.
        Your goal is to qualify the lead and guide them through a natural sales conversation about your AI-powered sales platform.

        KEY REQUIREMENTS:
        1. Keep responses brief and conversational (2-3 sentences max)
        2. Sound natural and human-like, not robotic
        3. Listen and respond to what the lead is saying
        4. Ask one clear question at a time
        5. Handle objections professionally
        6. Never mention that you are an AI
        7. Always use the company name ${companyName} when referring to your company
        8. Focus on how your AI-powered sales platform can help improve lead conversion rates`;
      }

      let promptTemplate = `
      ${aiPersona}

      CONVERSATION CONTEXT:
      - Lead Name: ${context.leadInfo?.name || 'Unknown'}
      - Company: ${context.leadInfo?.company_name || 'Unknown'}
      - Industry: ${context.leadInfo?.industry || 'Unknown'}
      - Previous Interest Level: ${context.currentClassification?.interest || 'Unknown'}
      - Identified Objections: ${context.currentClassification?.objections?.join(', ') || 'None'}

      ${context.customScript ? `CUSTOM INSTRUCTIONS:\n${context.customScript}\n` : ''}

      CONVERSATION CONTEXT AND HISTORY:
      ${context.conversationHistory ? context.conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n') : 'No conversation history'}

      CURRENT OBJECTIVE: ${this.getCallObjective()}

      KNOWLEDGE BASE FACTS:
      ${this.formatKnowledgeBaseInfo(context.companyInfo?.knowledge_base)}

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

          const result = await chat.sendMessage(promptTemplate);
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
            promptTemplate = `${promptTemplate}\n\nREMINDER: Respond in a single, clear statement that a sales agent would say.`;
          } else if (retryError.message.includes('validation')) {
            // Try with more specific guidance
            promptTemplate = `${promptTemplate}\n\nIMPORTANT: Respond with a complete, natural sentence that directly addresses the lead's last input.`;
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
        .replace(/^(AI|Assistant|Response|Agent|Sarah|System):\s*/i, '')
        .replace(/^['"]|['"]$/g, '') // Remove surrounding quotes
        .replace(/```[\s\S]*?```/g, '') // Remove code blocks
        .replace(/\[.*?\]/g, '') // Remove square brackets
        .replace(/\(.*?\)/g, '') // Remove parentheses
        .replace(/\n+/g, ' ') // Replace newlines
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();

      // Check for obvious AI/system-like phrases and replace them
      const systemPhrases = [
        { phrase: 'as an ai', replacement: 'as a sales representative' },
        { phrase: 'as a language model', replacement: 'as a sales representative' },
        { phrase: 'as an assistant', replacement: 'as a sales representative' },
        { phrase: 'i am an ai', replacement: 'I am a sales representative' },
        { phrase: 'i apologize', replacement: 'I understand' },
        { phrase: 'i am unable', replacement: 'I would like' },
        { phrase: 'i cannot', replacement: 'I would like to' },
        { phrase: 'i am not able', replacement: 'I would like to' },
      ];

      // Replace AI phrases instead of throwing an error
      for (const { phrase, replacement } of systemPhrases) {
        if (response.toLowerCase().includes(phrase)) {
          this.debug(`Replacing AI phrase: "${phrase}" with "${replacement}"`);
          response = response.replace(new RegExp(phrase, 'gi'), replacement);
        }
      }

      // Ensure proper length
      if (response.length < 10) {
        throw new Error('Response too short');
      }

      // Allow longer responses for more natural conversation
      if (response.length > 200) {
        response = response.substring(0, 197) + '...';
      }

      // Ensure proper sentence structure - start with capital letter
      if (!response.match(/^[A-Z]/)) {
        // Fix capitalization instead of throwing error
        response = response.charAt(0).toUpperCase() + response.slice(1);
      }

      // Add ending punctuation if missing
      if (!response.match(/[.!?]$/)) {
        // Add a period instead of throwing error
        response = response + '.';
      }

      // Remove technical content
      response = response
        .replace(/JSON/g, 'information')
        .replace(/```/g, '')
        .replace(/</g, '')
        .replace(/>/g, '');

      return response;
    } catch (error) {
      this.debug('Error cleaning response:', error);

      // Instead of throwing, try to return a usable response
      if (response && response.length >= 10) {
        // Basic cleanup
        return response
          .replace(/^(AI|Assistant|Response|Agent):\s*/i, '')
          .replace(/```[\s\S]*?```/g, '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      throw new Error(`Failed to clean response: ${error.message}`);
    }
  }

  validateResponse(response) {
    if (!response) return false;

    // Check for minimum length (but allow longer responses)
    if (response.length < 10) return false;

    // Allow longer responses but truncate them in the cleanResponse method
    // if (response.length > 200) return false;

    // Check for basic sentence structure - should start with capital letter
    // But be more lenient about ending punctuation
    if (!response.match(/^[A-Z]/)) return false;

    // Check for obviously non-conversational content
    const criticalNonConversationalIndicators = [
      'undefined',
      'null',
      '{',
      '}',
      'function',
      'error:',
      'exception',
      'traceback',
      'console.log'
    ];

    if (criticalNonConversationalIndicators.some(indicator =>
      response.toLowerCase().includes(indicator)
    )) {
      return false;
    }

    // Less strict check for AI-related terms - only reject if they're obvious
    const aiTerms = [
      'as an ai',
      'as an artificial intelligence',
      'as a language model',
      'as an assistant',
      'i am an ai'
    ];

    if (aiTerms.some(term => response.toLowerCase().includes(term))) {
      return false;
    }

    // Check for natural conversation flow, but be more lenient
    // Only one of these indicators needs to be present
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
      'would',
      'business',
      'company',
      'team',
      'sales',
      'lead',
      'customer',
      'service',
      'product',
      'solution',
      'platform',
      'technology',
      'process',
      'system',
      'improve',
      'increase',
      'reduce',
      'enhance',
      'optimize'
    ];

    const hasNaturalFlow = naturalFlowIndicators.some(indicator =>
      response.toLowerCase().includes(indicator)
    );

    // Be more lenient - if it passes most checks, let it through
    return hasNaturalFlow;
  }

  handleError(error) {
    this.debug('AI Agent Error:', error);

    // Increment retry count
    this.retryCount++;

    // Different responses based on retry count and error type
    if (this.retryCount >= 3) {
      // After 3 retries, give up and offer human follow-up
      return "I apologize, but I'm having some technical difficulties with our connection. Let me have one of our team members call you back to continue this conversation. Thank you for your time.";
    }

    // Provide different responses based on error type
    const errorMessage = error?.message?.toLowerCase() || '';

    if (errorMessage.includes('model') || errorMessage.includes('ai') || errorMessage.includes('initialize')) {
      // AI model issues
      return "I apologize for the brief pause. Could you please tell me more about your business needs so I can better assist you?";
    } else if (errorMessage.includes('database') || errorMessage.includes('supabase')) {
      // Database issues
      return "I'm having trouble accessing some information. While that's being resolved, could you tell me more about what you're looking for in a solution like ours?";
    } else if (errorMessage.includes('validation') || errorMessage.includes('response')) {
      // Response generation issues
      return "I want to make sure I understand correctly. Could you please explain your question or concern in a bit more detail?";
    } else {
      // Generic fallback
      return "I apologize for the confusion. To better assist you, could you please rephrase your question or share more about your business needs?";
    }
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

      // Use the custom script or default to Prosparity instructions
      const greetingInstructions = this.customScript || DEFAULT_PROSPARITY_INSTRUCTIONS;

      // Use the company name from initialization or default to Prosparity.ai
      const companyName = this.companyName || 'Prosparity.ai';
      this.debug('Using company name for greeting:', companyName);

      const prompt = `
      ## Generate a greeting for a sales call

      Instructions from custom script:
      ${greetingInstructions}

      Context:
      - You are calling from ${companyName}
      - You are calling ${leadName || 'a potential customer'}
      - Keep the tone professional but warm
      - Focus specifically on the Introduction and Greeting section from the instructions above

      Requirements:
      1. Keep it brief (2-3 sentences)
      2. Sound natural and conversational
      3. Include the lead's name if provided
      4. Clearly identify yourself and state you're from ${companyName}
      5. Mention you're calling about your AI-powered sales platform
      6. Ask if they have a moment to talk

      Example format (adapt to match the instructions above):
      "Hi [name], this is [agent name] from ${companyName}. I'm calling to discuss how our AI-powered sales platform can help improve your lead conversion rates. Do you have a moment to chat?"

      Generate ONLY the greeting, nothing else.`;

      this.debug('Greeting prompt:', prompt);

      // Multiple attempts with fallbacks
      let greeting = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!greeting && attempts < maxAttempts) {
        try {
          attempts++;
          this.debug(`Attempt ${attempts} to generate greeting`);

          const result = await this.model.generateContent(prompt);
          if (!result || !result.response) {
            throw new Error('Failed to generate greeting from AI model');
          }

          const generatedText = await result.response.text();
          this.debug(`Raw generated greeting: "${generatedText}"`);

          greeting = this.cleanResponse(generatedText);

          if (!greeting || greeting.length < 10) {
            throw new Error('Generated greeting is too short or empty');
          }

          // Basic sanity check - must mention the company name
          // Use a case-insensitive check that works with any company name
          const companyNameLower = companyName.toLowerCase();
          if (!greeting.toLowerCase().includes(companyNameLower)) {
            throw new Error(`Generated greeting missing company name ${companyName}`);
          }

          this.debug('Generated valid greeting');
        } catch (error) {
          this.debug(`Error in greeting generation attempt ${attempts}:`, error);

          if (attempts >= maxAttempts) {
            // Use fallback greeting as last resort
            this.debug('Using fallback greeting');
            greeting = leadName
              ? `Hello ${leadName}, I'm calling from ${companyName} about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`
              : `Hello, I'm calling from ${companyName} about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`;
          }

          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
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

      // Fallback greeting as absolute last resort
      const companyName = this.companyName || 'Prosparity.ai';
      const fallbackGreeting = leadName
        ? `Hello ${leadName}, I'm calling from ${companyName} about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`
        : `Hello, I'm calling from ${companyName} about our AI-powered sales platform that can help improve your lead conversion rates. Do you have a moment to talk?`;

      this.conversationHistory.push({
        role: 'agent',
        text: fallbackGreeting,
        timestamp: new Date().toISOString()
      });

      return fallbackGreeting;
    }
  }

  async generateInsights(conversationHistory) {
    if (!this.isInitialized || !conversationHistory?.length) {
      this.debug('Cannot generate insights: AI agent not initialized or no conversation history');
      return {
        error: "AI agent not initialized or no conversation history",
        partialData: this.leadClassification
      };
    }

    this.debug('Generating insights from conversation history');
    this.debug('Using geminiAI to analyze conversation');

    try {
      // Use the imported geminiAI to analyze the conversation
      const conversationAnalysis = await geminiAI.analyzeConversation(
        conversationHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.text}`).join('\n')
      );

      this.debug('Received analysis from geminiAI:', conversationAnalysis);

      // Update lead classification directly from the analysis
      this.leadClassification = {
        interest: conversationAnalysis.sentiment?.toLowerCase() === 'positive' ? 'high' :
                 conversationAnalysis.sentiment?.toLowerCase() === 'negative' ? 'low' : 'medium',
        objections: conversationAnalysis.objections || [],
        needsFollowUp: conversationAnalysis.nextSteps?.toLowerCase().includes('follow') || false,
        followUpDate: null, // Set this based on business logic
        insights: conversationAnalysis.keyPoints || []
      };

      this.debug('Updated lead classification:', this.leadClassification);
      return conversationAnalysis;
    } catch (error) {
      this.debug('Error generating insights:', error);
      return {
        error: "Failed to generate insights",
        partialData: this.leadClassification
      };
    }
  }

  formatConversationHistory(history) {
    if (!history?.length) return "No conversation history";
    return history.map(msg =>
      `${msg.role.toUpperCase()}: ${msg.text}`
    ).join('\n');
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

  async analyzeLeadIntent(speechInput) {
    try {
      this.debug('Analyzing lead intent for:', speechInput);

      // Use the imported geminiAI instead of direct genAI reference

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

      // Use the imported geminiAI to analyze the lead intent
      const result = await geminiAI.generateResponse(prompt, {
        leadInfo: { response: speechInput },
        companyInfo: { name: this.companyName }
      });
      const analysisText = result;

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

  formatKnowledgeBaseInfo(knowledgeBase) {
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

  getCallObjective() {
    // Determine the current objective based on conversation state
    if (!this.conversationHistory || this.conversationHistory.length <= 2) {
      return "Introduce yourself and qualify the lead's interest";
    }

    // Check if we've already identified interest level
    if (this.leadClassification.interest === 'high') {
      return "Move towards scheduling a demo or next steps";
    } else if (this.leadClassification.interest === 'medium') {
      return "Address any concerns and build more interest";
    } else if (this.leadClassification.interest === 'low') {
      return "Understand objections and determine if follow-up is appropriate";
    }

    // Default objective if we haven't classified interest yet
    return "Qualify the lead's interest and identify their needs";
  }
}
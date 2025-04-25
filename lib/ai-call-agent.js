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
      interest: null, // 'high', 'medium', 'low', 'none'
      objections: [],
      needsFollowUp: false,
      followUpDate: null,
      insights: []
    };
    this.customScript = null;
    this.aiSettings = null;
  }

  async initialize() {
    try {
      // Fetch AI settings and custom script
      const { data: settings, error: settingsError } = await supabase
        .from('ai_settings')
        .select('*')
        .single();

      if (settingsError) {
        console.error('Error fetching AI settings:', settingsError);
      } else {
        this.aiSettings = settings;
        this.customScript = settings.custom_script;
      }

      // Fetch lead's previous custom scripts if any
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('ai_settings')
        .eq('id', this.leadId)
        .single();

      if (!leadError && lead?.ai_settings?.custom_script) {
        // Use lead-specific custom script if available
        this.customScript = lead.ai_settings.custom_script;
      }
    } catch (error) {
      console.error('Error initializing AI agent:', error);
    }
  }

  async processSpeech(speechInput) {
    if (!speechInput) return;
    
    try {
      // Initialize if not already done
      if (!this.customScript) {
        await this.initialize();
      }
      
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
        currentObjective: this.getCallObjective(),
        customScript: this.customScript,
        aiSettings: this.aiSettings
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
  
  async analyzeLeadIntent(speech) {
    const text = speech.toLowerCase();
    
    // Enhanced intent analysis with more patterns
    const intentPatterns = {
      interest: {
        high: ['interested', 'love', 'great', 'perfect', 'exactly', 'want', 'need', 'looking for', 'sounds good', 'impressed', 'excited', 'definitely', 'absolutely'],
        medium: ['maybe', 'could', 'might', 'possibly', 'consider', 'think about', 'interesting', 'worth looking into', 'potential', 'promising'],
        low: ['not sure', 'don\'t know', 'maybe later', 'not right now', 'busy', 'occupied', 'later', 'future', 'sometime'],
        none: ['not interested', 'no thanks', 'not for me', 'don\'t want', 'not a fit', 'not relevant', 'not what we need']
      },
      objections: {
        price: ['expensive', 'cost', 'price', 'budget', 'afford', 'investment', 'ROI', 'return', 'value', 'worth'],
        timing: ['busy', 'later', 'not now', 'time', 'schedule', 'quarter', 'year', 'timeline', 'deadline'],
        competition: ['competitor', 'already have', 'using', 'other solution', 'alternative', 'similar', 'comparable'],
        authority: ['boss', 'manager', 'decision', 'approval', 'team', 'committee', 'board', 'stakeholders'],
        need: ['don\'t need', 'not necessary', 'working fine', 'good enough', 'satisfied', 'happy with'],
        features: ['missing', 'lack', 'need more', 'want more', 'not enough', 'limited', 'restricted'],
        trust: ['concerned', 'worried', 'skeptical', 'doubt', 'question', 'uncertain', 'hesitant']
      },
      followUp: {
        positive: ['call back', 'follow up', 'contact', 'reach out', 'schedule', 'meeting', 'demo', 'presentation', 'discuss', 'explore'],
        negative: ['don\'t call', 'no follow up', 'remove', 'stop calling', 'unsubscribe', 'opt out']
      },
      painPoints: {
        efficiency: ['slow', 'inefficient', 'time-consuming', 'manual', 'tedious', 'repetitive', 'bottleneck'],
        cost: ['expensive', 'costly', 'over budget', 'waste', 'ineffective', 'inefficient'],
        growth: ['scale', 'grow', 'expand', 'handle more', 'capacity', 'volume', 'demand'],
        quality: ['errors', 'mistakes', 'inconsistent', 'unreliable', 'poor quality', 'issues'],
        competition: ['falling behind', 'losing ground', 'competitive', 'market share', 'differentiate']
      },
      buyingSignals: {
        budget: ['budget', 'funding', 'allocation', 'resources', 'investment', 'ROI'],
        timeline: ['timeline', 'deadline', 'implementation', 'rollout', 'launch', 'go-live'],
        decision: ['decision maker', 'approval', 'sign off', 'contract', 'agreement', 'terms'],
        evaluation: ['evaluate', 'compare', 'assess', 'review', 'demo', 'trial', 'pilot']
      }
    };

    // Analyze interest level with weighted scoring
    let interestScore = 0;
    for (const [level, patterns] of Object.entries(intentPatterns.interest)) {
      const matches = patterns.filter(pattern => text.includes(pattern)).length;
      const weight = {
        high: 3,
        medium: 2,
        low: 1,
        none: 0
      }[level];
      interestScore += matches * weight;
    }
    
    // Set interest level based on score
    if (interestScore >= 6) this.leadClassification.interest = 'high';
    else if (interestScore >= 3) this.leadClassification.interest = 'medium';
    else if (interestScore >= 1) this.leadClassification.interest = 'low';
    else this.leadClassification.interest = 'none';

    // Analyze objections with context
    for (const [type, patterns] of Object.entries(intentPatterns.objections)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        if (!this.leadClassification.objections.includes(type)) {
          this.leadClassification.objections.push(type);
        }
      }
    }

    // Analyze follow-up needs with context
    for (const [type, patterns] of Object.entries(intentPatterns.followUp)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        this.leadClassification.needsFollowUp = type === 'positive';
        if (type === 'positive') {
          // Extract follow-up date if mentioned
          const dateMatch = text.match(/(?:call|contact|reach out|follow up|schedule|meeting|demo) (?:on|at|during|for) (.+)/i);
          if (dateMatch) {
            this.leadClassification.followUpDate = dateMatch[1];
          }
        }
      }
    }

    // Track pain points
    const identifiedPainPoints = [];
    for (const [category, patterns] of Object.entries(intentPatterns.painPoints)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        identifiedPainPoints.push(category);
      }
    }
    if (identifiedPainPoints.length > 0) {
      this.leadClassification.insights.push(`Identified pain points: ${identifiedPainPoints.join(', ')}`);
    }

    // Track buying signals
    const identifiedSignals = [];
    for (const [category, patterns] of Object.entries(intentPatterns.buyingSignals)) {
      if (patterns.some(pattern => text.includes(pattern))) {
        identifiedSignals.push(category);
      }
    }
    if (identifiedSignals.length > 0) {
      this.leadClassification.insights.push(`Identified buying signals: ${identifiedSignals.join(', ')}`);
    }
    
    // Add the analyzed information to the history
    this.conversationHistory.push({
      role: 'system',
      text: `[Analysis: Interest level: ${this.leadClassification.interest || 'unknown'}, 
              Objections: ${this.leadClassification.objections.length > 0 ? this.leadClassification.objections.join(', ') : 'none detected'},
              Follow-up: ${this.leadClassification.needsFollowUp ? 'needed' : 'not needed'}${this.leadClassification.followUpDate ? ` (${this.leadClassification.followUpDate})` : ''},
              Pain Points: ${identifiedPainPoints.length > 0 ? identifiedPainPoints.join(', ') : 'none detected'},
              Buying Signals: ${identifiedSignals.length > 0 ? identifiedSignals.join(', ') : 'none detected'}]`,
      timestamp: new Date().toISOString()
    });
  }
  
  async generateContextualResponse(userInput, context) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a comprehensive prompt with enhanced context
    const prompt = `
      You are an AI sales agent having a conversation with a lead. Your goal is to qualify the lead and move them through the sales process naturally.

      Current Context:
      - Lead Name: ${context.leadInfo?.name || 'Unknown'}
      - Company: ${context.leadInfo?.company_name || 'Unknown'}
      - Current Interest Level: ${context.currentClassification.interest || 'Unknown'}
      - Identified Objections: ${context.currentClassification.objections.join(', ') || 'None'}
      - Follow-up Needed: ${context.currentClassification.needsFollowUp ? 'Yes' : 'No'}${context.currentClassification.followUpDate ? ` (${context.currentClassification.followUpDate})` : ''}
      - Call Objective: ${context.currentObjective || 'Qualify lead and identify needs'}

      Company Information:
      - Industry: ${context.companyInfo?.industry || 'Unknown'}
      - Products/Services: ${context.companyInfo?.products || 'Unknown'}
      - Value Proposition: ${context.companyInfo?.value_proposition || 'Unknown'}

      Conversation History:
      ${this.formatConversationHistory(context.conversationHistory)}

      Previous Interactions:
      ${this.formatPreviousInteractions(context.previousCalls)}

      Lead's Last Input: "${userInput}"

      Please generate a natural, contextually appropriate response that:
      1. Acknowledges the lead's input and shows understanding
      2. Addresses any specific concerns or objections identified
      3. Gathers more qualifying information based on the current context
      4. Moves the conversation toward the objective while maintaining rapport
      5. Maintains a professional but friendly tone
      6. If follow-up is needed, naturally incorporates that into the response
      7. Uses the conversation history to avoid repetition
      8. Asks open-ended questions to gather more information
      9. Identifies potential pain points and needs
      10. Suggests next steps based on the lead's interest level

      The response should be:
      - Concise (2-3 sentences)
      - Conversational and natural
      - Focused on the lead's specific situation
      - Include a clear next step or question
      - Avoid repeating previous responses
      - Show genuine interest in the lead's needs
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Clean up the response
      return this.cleanResponse(response);
    } catch (error) {
      console.error('Error generating contextual response:', error);
      return this.getFallbackResponse(context.currentClassification);
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

  getFallbackResponse(classification) {
    const fallbacks = {
      high: [
        "I understand your interest. Could you tell me more about your specific needs?",
        "That's great to hear. How would this solution fit into your current processes?",
        "I'd love to learn more about your requirements. What specific outcomes are you looking to achieve?"
      ],
      medium: [
        "I appreciate your consideration. What aspects would be most important for you to evaluate?",
        "That's a good point. How do you typically evaluate new solutions for your business?",
        "What specific challenges are you looking to solve?"
      ],
      low: [
        "I understand this might not be the right time. What would make this more relevant for you?",
        "I appreciate your feedback. Is there a specific reason this isn't a good fit right now?",
        "What would need to change for this to be more valuable to you?"
      ],
      none: [
        "I understand this isn't what you're looking for. Thank you for your time.",
        "I appreciate your feedback. Is there anything specific that didn't meet your needs?",
        "Thank you for letting me know. I understand this isn't the right solution for you."
      ]
    };

    const interestLevel = classification?.interest || 'medium';
    const responses = fallbacks[interestLevel] || fallbacks.medium;
    return responses[Math.floor(Math.random() * responses.length)];
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
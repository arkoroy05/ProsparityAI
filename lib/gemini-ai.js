import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with API key
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn('Gemini API key not found in environment variables');
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Available models in order of preference
const AVAILABLE_MODELS = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];

/**
 * Get an available Gemini model with fallback options
 * @param {Object} options - Configuration options
 * @param {string} options.preferredModel - Preferred model to use
 * @returns {Promise<Object>} - The model instance
 */
async function getAvailableModel({ preferredModel = "gemini-pro" } = {}) {
  const models = preferredModel ? 
    [preferredModel, ...AVAILABLE_MODELS.filter(m => m !== preferredModel)] : 
    AVAILABLE_MODELS;

  let lastError = null;

  for (const model of models) {
    try {
      const generativeModel = genAI.getGenerativeModel({ 
        model,
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      });

      // Test the model with a simple prompt
      await generativeModel.generateContent("Test connection.");
      console.log(`Successfully connected to Gemini model: ${model}`);
      return generativeModel;
    } catch (error) {
      console.warn(`Failed to initialize model ${model}:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`Failed to initialize any Gemini model: ${lastError?.message}`);
}

/**
 * Generate a text response from Gemini
 * @param {string} prompt - The prompt for the AI
 * @param {Object} context - Additional context like company data, lead info, etc.
 * @returns {Promise<string>} - The AI-generated response
 */
export async function generateResponse(prompt, context = {}) {
  try {
    // Prepare a system prompt with context
    const systemPrompt = createSystemPrompt(context);
    
    // Get an available model
    const model = await getAvailableModel();
    
    // Generate content with the combined system prompt and user prompt
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: prompt }
    ]);

    if (!result?.response) {
      throw new Error('No response received from AI model');
    }

    // Get the response text and validate it
    const responseText = result.response.text();
    if (!responseText || responseText.length < 2) {
      throw new Error('Invalid response from AI model');
    }

    return responseText;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
}

/**
 * Create a system prompt with relevant context
 * @param {Object} context - Contextual data
 * @returns {string} - A formatted system prompt
 */
function createSystemPrompt(context = {}) {
  const { 
    companyInfo = {}, 
    leadInfo = {}, 
    callObjective = '',
    knowledgeBase = [],
    previousConversations = [],
    customScript = '',
    aiSettings = {}
  } = context;

  // Company context
  const companyContext = companyInfo.name ? `
      Company Information:
    - Name: ${companyInfo.name}
    - Industry: ${companyInfo.industry || 'Unknown'}
    - Size: ${companyInfo.size || 'Unknown'}
    - Products/Services: ${companyInfo.products || 'Unknown'}
    - Value Proposition: ${companyInfo.value_proposition || 'Unknown'}
    - Target Market: ${companyInfo.target_market || 'Unknown'}
    - Key Differentiators: ${companyInfo.differentiators || 'Unknown'}
  ` : '';

  // Lead context
  const leadContext = leadInfo.name ? `
      Lead Information:
    - Name: ${leadInfo.name}
    - Company: ${leadInfo.company_name || 'Unknown'}
    - Role: ${leadInfo.role || 'Unknown'}
    - Industry: ${leadInfo.industry || 'Unknown'}
    - Pain Points: ${leadInfo.pain_points || 'Unknown'}
    - Budget: ${leadInfo.budget || 'Unknown'}
    - Timeline: ${leadInfo.timeline || 'Unknown'}
    - Previous Interactions: ${leadInfo.interaction_count || 0}
    - Last Contact: ${leadInfo.last_contacted_at || 'Never'}
    - Status: ${leadInfo.status || 'New'}
  ` : '';

  // Knowledge base context
  const knowledgeBaseContext = knowledgeBase.length > 0 ? `
    Company Knowledge Base:
    ${knowledgeBase.map(item => `
    - Topic: ${item.topic}
      Content: ${item.content}
      Last Updated: ${item.updated_at || 'Unknown'}
    `).join('\n')}
  ` : '';

  // Previous conversations context
  const conversationsContext = previousConversations.length > 0 ? `
      Previous Conversations:
    ${previousConversations.map(conv => `
    - Date: ${conv.created_at}
      Summary: ${conv.summary || 'No summary available'}
      Sentiment: ${conv.sentiment || 'Neutral'}
      Key Points: ${conv.key_points || 'None recorded'}
    `).join('\n')}
  ` : '';

  // Custom script context
  const customScriptContext = customScript ? `
    Custom Script Guidelines:
    ${customScript}
  ` : '';

  // AI settings context
  const aiSettingsContext = aiSettings ? `
    AI Configuration:
    - Tone: ${aiSettings.tone || 'Professional'}
    - Approach: ${aiSettings.approach || 'Consultative'}
    - Key Messages: ${aiSettings.key_messages || 'None specified'}
    - Call to Action: ${aiSettings.call_to_action || 'None specified'}
    - Objection Handling: ${aiSettings.objection_handling || 'Standard'}
    - Follow-up Strategy: ${aiSettings.follow_up_strategy || 'Standard'}
  ` : '';

  // Combine all context
  return `
    You are an AI sales assistant for Prosparity.AI, a platform that helps businesses manage leads and automate sales outreach.
    Your goal is to have natural, engaging conversations with potential customers, answer their questions, and guide them through the sales process.
    ${callObjective ? `Your primary objective for this conversation is: ${callObjective}` : ''}
    
    ${companyContext}
    
    ${leadContext}
    
    ${knowledgeBaseContext}
    
    ${conversationsContext}
    
    ${customScriptContext}
    
    ${aiSettingsContext}
    
    Important guidelines:
    - Be professional, friendly, and conversational
    - Don't be overly aggressive or pushy
    - Listen carefully to customer needs and respond appropriately
    - Use the knowledge base information when relevant
    - If you don't know an answer, acknowledge it and offer to follow up
    - Always respect privacy and compliance regulations
    - Follow the custom script guidelines when provided
    - Adapt your tone and approach based on the AI settings
    - Track and address objections naturally
    - Identify and explore pain points
    - Look for buying signals
    - Guide the conversation toward the call objective
    - Maintain context awareness throughout the conversation
    - Avoid repeating previous responses
    - Ask open-ended questions to gather more information
    - Provide value in every interaction
    
    Please respond as a helpful sales assistant.
  `;
}

/**
 * Classify a lead based on available information
 * @param {Object} leadData - The lead data to classify
 * @param {Object} companyContext - Company-specific context
 * @returns {Promise<Object>} - Classification results
 */
export async function classifyLead(leadData, companyContext = {}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      Analyze the following lead information and classify it:
      
      Lead Data:
      ${JSON.stringify(leadData, null, 2)}
      
      Company Context:
      ${JSON.stringify(companyContext, null, 2)}
      
      Please provide the following in JSON format:
      1. A lead score from 1-100
      2. Interest level (High, Medium, Low)
      3. Recommended next action
      4. Estimated deal value (if applicable)
      5. Brief reasoning for your classification
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Try to parse JSON from the response
    try {
      return JSON.parse(response);
    } catch (e) {
      // If can't parse, return the raw text
      return { 
        rawResponse: response,
        score: 50,
        interestLevel: 'Medium',
        nextAction: 'Evaluate manually',
        estimatedValue: 'Unknown',
        reasoning: 'Could not automatically classify' 
      };
    }
  } catch (error) {
    console.error('Error classifying lead:', error);
    throw new Error('Failed to classify lead');
  }
}

/**
 * Generate call talking points based on lead information
 * @param {Object} leadInfo - Information about the lead
 * @param {Object} companyInfo - Information about the company
 * @returns {Promise<Array>} - Array of talking points
 */
export async function generateTalkingPoints(leadInfo, companyInfo) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      Generate 5 key talking points for a sales call with the following lead:
      
      Lead Information:
      ${JSON.stringify(leadInfo, null, 2)}
      
      Company Information:
      ${JSON.stringify(companyInfo, null, 2)}
      
      For each talking point, include:
      1. The talking point itself
      2. Why it's relevant to this lead
      3. Potential questions to ask related to this point
      
      Format the response as a JSON array of talking point objects.
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Try to parse JSON from the response
    try {
      return JSON.parse(response);
    } catch (e) {
      // If can't parse, extract the talking points manually
      const points = response.split(/\d+\./).filter(p => p.trim()).map(p => p.trim());
      return points.map(point => ({
        point: point,
        relevance: 'Generated talking point',
        questions: []
      }));
    }
  } catch (error) {
    console.error('Error generating talking points:', error);
    throw new Error('Failed to generate talking points');
  }
}

/**
 * Analyze and summarize a conversation
 * @param {string} conversationText - The text of the conversation
 * @returns {Promise<Object>} - Analysis and summary
 */
export async function analyzeConversation(conversationText) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `
      Analyze the following sales call conversation and provide:
      
      Conversation:
      ${conversationText}
      
      Please return a JSON object with:
      1. A brief summary of the conversation
      2. Key points discussed
      3. Customer sentiment (positive, neutral, negative)
      4. Identified needs or pain points
      5. Objections raised
      6. Recommended next steps
      7. Overall call effectiveness score (1-10)
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Try to parse JSON from the response
    try {
      return JSON.parse(response);
    } catch (e) {
      // If can't parse, return a structured object with the raw text
      return {
        summary: "Analysis could not be structured automatically",
        rawAnalysis: response,
        sentiment: "Unknown",
        nextSteps: "Review conversation manually",
        effectiveness: 5
      };
    }
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    throw new Error('Failed to analyze conversation');
  }
}

const geminiAI = {
  generateResponse,
  classifyLead,
  generateTalkingPoints,
  analyzeConversation
};

export default geminiAI;
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Gemini API with API key
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

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
    
    // Get the text generation model (Gemini Pro)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Generate content with the combined system prompt and user prompt
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: prompt }
    ]);

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new Error('Failed to generate AI response');
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
    companyKnowledgeBase = [],
    previousConversations = []
  } = context;

  // Build company context
  let companyContext = '';
  if (companyInfo.name) {
    companyContext = `
      Company Information:
      Name: ${companyInfo.name}
      Industry: ${companyInfo.industry || 'Not specified'}
      Description: ${companyInfo.description || 'Not specified'}
    `;
  }

  // Build lead context
  let leadContext = '';
  if (leadInfo.name) {
    leadContext = `
      Lead Information:
      Name: ${leadInfo.name}
      Company: ${leadInfo.company || 'Not specified'}
      Position: ${leadInfo.position || 'Not specified'}
      Email: ${leadInfo.email || 'Not specified'}
      Phone: ${leadInfo.phone || 'Not specified'}
      Score: ${leadInfo.score || 'Not specified'}
      Status: ${leadInfo.status || 'Not specified'}
      Notes: ${leadInfo.notes || 'Not specified'}
    `;
  }

  // Build knowledge base context
  let knowledgeBaseContext = '';
  if (companyKnowledgeBase && companyKnowledgeBase.length > 0) {
    knowledgeBaseContext = `
      Knowledge Base Information:
      ${companyKnowledgeBase.map(item => `- ${item.title}: ${item.content}`).join('\n')}
    `;
  }

  // Build previous conversations context
  let conversationsContext = '';
  if (previousConversations && previousConversations.length > 0) {
    conversationsContext = `
      Previous Conversations:
      ${previousConversations.map(conv => 
        `Date: ${conv.date}\nSummary: ${conv.summary}`
      ).join('\n\n')}
    `;
  }

  // Combine all context
  return `
    You are an AI sales assistant for Prosparity.AI, a platform that helps businesses manage leads and automate sales outreach.
    Your goal is to have natural, engaging conversations with potential customers, answer their questions, and guide them through the sales process.
    ${callObjective ? `Your primary objective for this conversation is: ${callObjective}` : ''}
    
    ${companyContext}
    
    ${leadContext}
    
    ${knowledgeBaseContext}
    
    ${conversationsContext}
    
    Important guidelines:
    - Be professional, friendly, and conversational
    - Don't be overly aggressive or pushy
    - Listen carefully to customer needs and respond appropriately
    - Use the knowledge base information when relevant
    - If you don't know an answer, acknowledge it and offer to follow up
    - Always respect privacy and compliance regulations
    
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
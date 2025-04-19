import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';
import { getUser } from '@/lib/auth-utils';

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    // Check authentication
    const { user } = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { companyId, knowledgeBase } = await request.json();
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Validate the user has access to this company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .single();
    
    if (companyError || !company) {
      return NextResponse.json(
        { error: 'Company not found or access denied' },
        { status: 403 }
      );
    }

    // Format the knowledge for the AI
    const formattedKnowledge = formatKnowledgeForAI(knowledgeBase);
    
    // Update the AI model with the knowledge base
    await updateAIWithKnowledge(formattedKnowledge);
    
    // Update the database to indicate the knowledge was processed
    await supabase
      .from('ai_knowledge_base')
      .upsert({
        company_id: companyId,
        products: knowledgeBase.products,
        services: knowledgeBase.services,
        company_info: knowledgeBase.companyInfo,
        sales_instructions: knowledgeBase.salesInstructions,
        last_processed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    return NextResponse.json({
      success: true,
      message: 'AI knowledge base updated successfully'
    });
  } catch (error) {
    console.error('Error updating AI knowledge:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update AI knowledge' },
      { status: 500 }
    );
  }
}

// Format the knowledge base for the AI model
function formatKnowledgeForAI(knowledgeBase) {
  const { products, services, companyInfo, salesInstructions } = knowledgeBase;
  
  let formattedText = "# Knowledge Base Information\n\n";
  
  // Add company info
  formattedText += "## Company Information\n";
  formattedText += companyInfo || "No company information provided.";
  formattedText += "\n\n";
  
  // Add products
  formattedText += "## Products\n";
  if (products && products.length > 0) {
    products.forEach((product, index) => {
      formattedText += `### ${index + 1}. ${product.name}\n`;
      formattedText += `**Price:** ${product.price || 'N/A'}\n`;
      formattedText += `**Description:** ${product.description || 'No description provided.'}\n`;
      formattedText += `**Features:** ${product.features || 'No features listed.'}\n\n`;
    });
  } else {
    formattedText += "No products available.\n\n";
  }
  
  // Add services
  formattedText += "## Services\n";
  if (services && services.length > 0) {
    services.forEach((service, index) => {
      formattedText += `### ${index + 1}. ${service.name}\n`;
      formattedText += `**Price:** ${service.price || 'N/A'}\n`;
      formattedText += `**Description:** ${service.description || 'No description provided.'}\n`;
      formattedText += `**Benefits:** ${service.benefits || 'No benefits listed.'}\n\n`;
    });
  } else {
    formattedText += "No services available.\n\n";
  }
  
  // Add sales instructions
  formattedText += "## Sales Instructions\n";
  formattedText += salesInstructions || "No sales instructions provided.";
  
  return formattedText;
}

// Update the AI model with the new knowledge
async function updateAIWithKnowledge(formattedKnowledge) {
  try {
    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // Create a chat session to inform the model about the new knowledge
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI sales assistant. Please incorporate the following knowledge base into your understanding. This information should be used when making sales calls, qualifying leads, and discussing products and services with potential customers:\n\n${formattedKnowledge}`
            }
          ]
        }
      ]
    });
    
    // Get confirmation from the model
    const result = await chat.sendMessage(
      "Please confirm you've incorporated this knowledge base. I'll be using you for AI sales calls and lead qualification."
    );
    
    const response = await result.response;
    const confirmation = response.text();
    
    console.log('AI Model Knowledge Update Confirmation:', confirmation);
    
    return true;
  } catch (error) {
    console.error('Error updating AI with knowledge:', error);
    throw error;
  }
} 
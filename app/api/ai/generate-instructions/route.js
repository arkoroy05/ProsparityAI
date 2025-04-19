import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback instructions template for when AI is unavailable
const FALLBACK_INSTRUCTIONS = `# AI Sales Agent Instructions

## Introduction and Greeting
- Begin calls with "Hello, this is [AI Agent Name] from [COMPANY_NAME]."
- Maintain a professional, friendly tone throughout the conversation.
- Explain briefly that you're reaching out regarding their interest in our solutions.

## Qualifying Questions
- What challenges is your business currently facing?
- What solutions have you tried before?
- What's your timeline for implementing a new solution?
- Who else is involved in the decision-making process?

## Handling Common Objections
- "Not interested": Acknowledge their response and offer to send information for future reference.
- "Too expensive": Focus on ROI and long-term value rather than upfront costs.
- "Need to think about it": Offer a follow-up call with more specific information.
- "Using a competitor": Ask about their experience and what they'd improve.

## Call Flow Structure
1. Introduction and rapport building
2. Explain purpose of call
3. Ask qualifying questions
4. Address needs and pain points
5. Handle objections
6. Schedule next steps
7. Thank them for their time

## Success Metrics
- Conversion rate from calls to meetings
- Information gathered about prospect needs
- Objections successfully addressed
- Positive feedback from prospects`;

export async function POST(request) {
  try {
    // Parse the request JSON
    let companyData;
    let currentInstructions = '';
    
    try {
      const requestData = await request.json();
      companyData = requestData.company;
      currentInstructions = requestData.currentInstructions || '';
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid JSON in request' 
      }, { status: 400 });
    }

    // Validate company data
    if (!companyData || !companyData.name) {
      return NextResponse.json({ 
        success: false, 
        message: 'Company name is required' 
      }, { status: 400 });
    }

    // Log request info
    console.log('Generate instructions request:', {
      companyName: companyData.name,
      industry: companyData.industry || 'unspecified',
      hasDescription: !!companyData.description,
      hasExistingInstructions: currentInstructions.length > 0,
      instructionsLength: currentInstructions.length
    });

    // If user hasn't provided any instructions and there's no AI available, use the fallback immediately
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey && !currentInstructions) {
      console.warn('No Gemini API key found and no user instructions, using fallback template');
      return NextResponse.json({
        success: true,
        instructions: FALLBACK_INSTRUCTIONS.replace('[COMPANY_NAME]', companyData.name),
        usingFallback: true,
        generationMethod: 'fallback',
        reason: 'No API key configured'
      });
    }

    try {
      // Initialize the AI with API key
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Try multiple model options in case one is not available
      const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
      let result = null;
      let error = null;
      let usedModel = '';
      
      // Determine what type of prompt to use based on whether there are existing instructions
      let prompt;
      let generationMethod;
      
      if (currentInstructions && currentInstructions.length > 0) {
        // Use the enhance mode - improve existing instructions
        generationMethod = 'enhanced';
        prompt = `You are an expert AI sales agent consultant. A company has provided some instructions for their AI sales agent, but they would like you to enhance and improve these instructions.

Company Information:
Name: ${companyData.name}
Industry: ${companyData.industry || 'Various industries'}
Description: ${companyData.description || `${companyData.name} is a business focused on growth and customer satisfaction`}

Current Instructions:
"""
${currentInstructions}
"""

Please analyze these instructions and create an enhanced, more comprehensive version. Your improved instructions should:
1. Maintain the core intent and specific details from the original
2. Add structure if it's missing (with sections like Introduction, Questions, Objection Handling, etc.)
3. Fill in gaps in areas that are underdeveloped
4. Add specific, actionable guidance that aligns with professional sales practices
5. Include industry-specific terminology and approaches when relevant

Your enhanced instructions should be well-structured, comprehensive, and ready to guide an AI sales agent effectively.`;
      } else {
        // Generate new instructions from scratch
        generationMethod = 'generated';
        prompt = `As an AI sales agent expert, create detailed instructions for an AI agent that will be making calls on behalf of ${companyData.name}. The company operates in ${companyData.industry || 'various industries'}.

Company Description: ${companyData.description || `${companyData.name} is a business focused on growth and customer satisfaction`}

Please generate comprehensive instructions that cover:
1. Introduction and Greeting
2. Company Value Proposition
3. Qualifying Questions
4. Handling Common Objections
5. Call Flow and Structure
6. Follow-up Protocol
7. Industry-Specific Terminology
8. Tone and Communication Style
9. Compliance and Ethics Guidelines
10. Success Metrics and Goals

Make the instructions specific, actionable, and aligned with professional sales practices.`;
      }

      console.log('Attempting to generate content with Gemini API - Method:', generationMethod);
      
      // Try each model until one works
      for (const model of models) {
        try {
          console.log(`Attempting to use model: ${model}`);
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
          result = await generativeModel.generateContent(prompt);
          usedModel = model;
          break; // If successful, exit the loop
        } catch (modelError) {
          console.log(`Model ${model} failed:`, modelError.message);
          error = modelError;
          // Continue to try the next model
        }
      }
      
      if (!result) {
        throw error || new Error('All models failed to generate content');
      }
      
      const response = await result.response;
      const text = response.text();

      console.log('Gemini API response received successfully using model:', usedModel);

      // Format the instructions
      const formattedInstructions = text
        .replace(/\n\n/g, '\n')
        .trim();

      return NextResponse.json({
        success: true,
        instructions: formattedInstructions,
        model: usedModel,
        generationMethod
      });
    } catch (aiError) {
      // Log the detailed AI error
      console.error('AI Generation Error:', {
        message: aiError.message,
        stack: aiError.stack,
        name: aiError.name,
        details: aiError.details || 'No details available'
      });

      // If user provided instructions but AI failed, return their instructions with a message
      if (currentInstructions && currentInstructions.length > 0) {
        console.log('AI enhancement failed, returning original instructions');
        return NextResponse.json({
          success: true,
          instructions: currentInstructions,
          generationMethod: 'original',
          usingFallback: true,
          reason: 'AI enhancement failed: ' + aiError.message
        });
      }

      // Return fallback instructions with company name replacement
      console.log('Using fallback instructions due to API error');
      const customizedInstructions = FALLBACK_INSTRUCTIONS.replace('[COMPANY_NAME]', companyData.name);
      
      return NextResponse.json({
        success: true,
        instructions: customizedInstructions,
        usingFallback: true,
        generationMethod: 'fallback',
        reason: aiError.message
      });
    }
  } catch (error) {
    console.error('Error in generate-instructions API:', error);
    
    // Even in the case of an unexpected error, try to return valid JSON
    return NextResponse.json({ 
      success: false,
      message: error.message || 'Unexpected server error',
      errorType: error.name || 'Unknown'
    }, { status: 500 });
  }
} 
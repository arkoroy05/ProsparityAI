import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    // Log the API key (masked for security)
    const apiKey = process.env.GEMINI_API_KEY || '';
    const maskedKey = apiKey 
      ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`
      : 'not set';
    
    console.log('Testing Gemini API with key:', maskedKey);

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Gemini API key is not set',
        key: 'missing'
      }, { status: 400 });
    }

    // Initialize the AI
    const genAI = new GoogleGenerativeAI(apiKey);
    
    try {
      // Try multiple model options in case one is not available
      const models = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro"];
      let result = null;
      let error = null;
      let usedModel = '';
      
      // Try each model until one works
      for (const model of models) {
        try {
          console.log(`Attempting to use model: ${model}`);
          const generativeModel = genAI.getGenerativeModel({ model });
          result = await generativeModel.generateContent("Hello, what is 2+2?");
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

      return NextResponse.json({
        success: true,
        message: 'Gemini API is working correctly',
        model: usedModel,
        result: text,
        key: maskedKey
      });
    } catch (modelError) {
      console.error('Gemini model error:', modelError);
      
      return NextResponse.json({
        success: false,
        message: 'Failed to use any Gemini model',
        error: modelError.message,
        key: maskedKey,
        suggestion: 'Please check if your API key has access to the required models'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Gemini API verification error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to verify Gemini API',
      error: error.message,
      stack: error.stack,
      name: error.name
    }, { status: 500 });
  }
} 
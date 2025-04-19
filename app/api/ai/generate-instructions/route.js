import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export async function POST(request) {
  try {
    const { company } = await request.json();

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate natural and effective sales call instructions for an AI sales agent. The company is ${company.name} and they ${company.description || 'provide business solutions'}. Include:

1. Tone and communication style
2. Key qualifying questions
3. Common objection handling
4. Value proposition presentation
5. Call flow structure
6. Follow-up guidelines

Format the response as clear, actionable instructions that will guide the AI agent's conversation style and approach.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const instructions = response.text();

    return NextResponse.json({ instructions });
  } catch (error) {
    console.error('Error generating AI instructions:', error);
    return NextResponse.json(
      { error: 'Failed to generate instructions' },
      { status: 500 }
    );
  }
} 
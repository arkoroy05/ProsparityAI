import { NextResponse } from 'next/server';
import { AICallAgent } from '@/lib/ai-call-agent';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
  try {
    console.log('Starting AI call agent test...');
    
    // Get a test lead ID from the database
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, name, company_name')
      .limit(1);
      
    if (leadError) {
      console.error('Error fetching test lead:', leadError);
      return NextResponse.json({ error: 'Error fetching test lead' }, { status: 500 });
    }
    
    if (!leads || leads.length === 0) {
      console.error('No test leads found in database');
      return NextResponse.json({ error: 'No test leads found in database' }, { status: 404 });
    }
    
    const testLeadId = leads[0].id;
    console.log(`Using test lead: ${leads[0].name} (${testLeadId})`);
    
    // Create a new AI call agent
    const agent = new AICallAgent(testLeadId, null);
    await agent.initialize();
    
    if (!agent.isInitialized) {
      console.error('Failed to initialize AI call agent');
      return NextResponse.json({ error: 'Failed to initialize AI call agent' }, { status: 500 });
    }
    
    console.log('AI call agent initialized successfully');
    console.log('Using company name:', agent.companyName);
    console.log('Using custom script:', agent.customScript ? 'Yes (custom)' : 'No (default)');
    
    // Test initial greeting
    const greeting = await agent.getInitialGreeting(leads[0].name);
    
    // Test conversation
    const testInputs = [
      "Hi, who is this?",
      "What does your company do?",
      "How much does it cost?",
      "Can you send me more information?",
      "I'm not interested right now"
    ];
    
    const conversation = [];
    
    // Add greeting to conversation
    conversation.push({
      role: 'agent',
      text: greeting
    });
    
    // Process each test input
    for (const input of testInputs) {
      conversation.push({
        role: 'lead',
        text: input
      });
      
      const response = await agent.processSpeech(input);
      
      conversation.push({
        role: 'agent',
        text: response
      });
    }
    
    // Generate insights
    console.log('Generating conversation insights...');
    const insights = await agent.generateInsights(agent.conversationHistory);
    
    return NextResponse.json({
      success: true,
      lead: {
        id: leads[0].id,
        name: leads[0].name,
        company: leads[0].company_name
      },
      agent: {
        companyName: agent.companyName,
        hasCustomScript: !!agent.customScript
      },
      conversation,
      insights
    });
  } catch (error) {
    console.error('Error in AI call agent test:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

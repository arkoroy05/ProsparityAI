// Test script for AI call agent
const { AICallAgent } = require('./lib/ai-call-agent');
const { supabase } = require('./lib/supabase');

async function testAICallAgent() {
  try {
    console.log('Starting AI call agent test...');

    // Get a test lead ID from the database
    const { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('id, name, company_name')
      .limit(1);

    if (leadError) {
      console.error('Error fetching test lead:', leadError);
      return;
    }

    if (!leads || leads.length === 0) {
      console.error('No test leads found in database');
      return;
    }

    const testLeadId = leads[0].id;
    console.log(`Using test lead: ${leads[0].name} (${testLeadId})`);

    // Create a new AI call agent
    const agent = new AICallAgent(testLeadId, null);
    await agent.initialize();

    if (!agent.isInitialized) {
      console.error('Failed to initialize AI call agent');
      return;
    }

    console.log('AI call agent initialized successfully');
    console.log('Using company name:', agent.companyName);
    console.log('Using custom script:', agent.customScript ? 'Yes (custom)' : 'No (default)');

    // Test initial greeting
    const greeting = await agent.getInitialGreeting(leads[0].name);
    console.log('\nInitial greeting:');
    console.log(greeting);

    // Test conversation
    const testInputs = [
      "Hi, who is this?",
      "What does your company do?",
      "How much does it cost?",
      "Can you send me more information?",
      "I'm not interested right now"
    ];

    for (const input of testInputs) {
      console.log(`\nUser: ${input}`);
      const response = await agent.processSpeech(input);
      console.log(`AI: ${response}`);
    }

    // Generate insights
    console.log('\nGenerating conversation insights...');
    const insights = await agent.generateInsights(agent.conversationHistory);
    console.log('Conversation insights:', JSON.stringify(insights, null, 2));

    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error in AI call agent test:', error);
  }
}

// Run the test
testAICallAgent();

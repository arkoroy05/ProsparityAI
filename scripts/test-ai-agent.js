#!/usr/bin/env node

/**
 * Test script for the AI Call Agent
 * This script tests the AI agent functionality and helps diagnose issues
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { AICallAgent } from '../lib/ai-call-agent.js';
import { getAvailableModel } from '../lib/gemini-ai.js';

// Load environment variables from .env files
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Enable debug mode
process.env.NODE_ENV = 'development';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Log functions
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  highlight: (msg) => console.log(`${colors.magenta}[HIGHLIGHT]${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}[STEP]${colors.reset} ${msg}`),
};

// Test the Gemini AI model directly
async function testGeminiModel() {
  log.step('Testing Gemini AI model directly...');
  
  try {
    log.info('Checking GEMINI_API_KEY...');
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      log.error('GEMINI_API_KEY not found in environment variables');
      log.warning('Please set GEMINI_API_KEY in .env.local file');
      return false;
    }
    
    log.success(`API key found (starts with: ${apiKey.substring(0, 3)}...)`);
    
    log.info('Initializing Gemini model...');
    const model = await getAvailableModel();
    log.success('Gemini model initialized successfully');
    
    log.info('Testing simple generation...');
    const result = await model.generateContent('Respond with "OK" if you can understand this message.');
    const response = await result.response.text();
    
    log.info(`Response received: "${response}"`);
    
    if (response && response.toLowerCase().includes('ok')) {
      log.success('Model responded correctly');
      return true;
    } else {
      log.warning('Model response did not contain expected confirmation');
      return false;
    }
  } catch (error) {
    log.error(`Error testing Gemini model: ${error.message}`);
    if (error.stack) {
      log.info('Error stack trace:');
      console.error(error.stack);
    }
    return false;
  }
}

// Test AI call agent with a sample lead
async function testAICallAgent() {
  log.step('Testing AI Call Agent...');
  
  try {
    // Sample lead and task IDs for testing
    // Replace with real IDs from your database if available
    const testLeadId = process.env.TEST_LEAD_ID || '1';
    const testTaskId = process.env.TEST_TASK_ID || '1';
    
    log.info(`Creating AI Call Agent with leadId=${testLeadId}, taskId=${testTaskId}`);
    const agent = new AICallAgent(testLeadId, testTaskId);
    
    log.info('Initializing AI agent...');
    await agent.initialize();
    
    if (!agent.isInitialized) {
      log.error('AI agent failed to initialize');
      return false;
    }
    
    log.success('AI agent initialized successfully');
    
    log.info('Testing initial greeting generation...');
    const greeting = await agent.getInitialGreeting('Test User');
    
    if (!greeting) {
      log.error('Failed to generate initial greeting');
      return false;
    }
    
    log.success(`Initial greeting generated: "${greeting}"`);
    
    log.info('Testing speech processing...');
    const response = await agent.processSpeech('Hello, I\'m interested in learning more about your services.');
    
    if (!response) {
      log.error('Failed to process speech input');
      return false;
    }
    
    log.success(`Response generated: "${response}"`);
    
    // Test a specific script with the Workwise instructions
    log.info('Testing with Workwise instructions...');
    
    // Set the custom script
    agent.customScript = `
## Workwise AI Sales Agent Instructions
**Objective:** To generate qualified leads and book meetings for Workwise by conducting outbound sales calls.
**1. Introduction and Greeting:**
* **Start with a personalized greeting:**  "Hi [Prospect Name], this is [AI Agent Name] calling from Workwise."  Avoid generic greetings like "Hello."  Always use the prospect's name if available.
* **Briefly state your purpose:** "I'm calling today to discuss how Workwise can help [mention their industry/company size, if known] improve [mention a specific pain point relevant to their industry, if known, e.g., efficiency, productivity, security]."
* **Keep it concise and engaging:** Aim for a 10-15 second introduction. Avoid lengthy monologues.
**2. Company Value Proposition:**
* **Focus on benefits, not features:**  Instead of saying "Our software has a user-friendly interface," say "Our software will save your team valuable time and increase productivity by streamlining [specific task]."
* **Highlight key differentiators:** What makes Workwise unique compared to competitors? Emphasize this clearly.  Examples: superior integration capabilities, exceptional customer support, unique algorithm, specific industry focus.
* **Tailor the value proposition:** Use information gathered about the prospect (industry, company size, challenges) to customize your message.
* **Quantify results:** Whenever possible, use numbers to showcase impact (e.g., "increased efficiency by 20%," "reduced costs by 15%").
    `;
    
    const workwiseResponse = await agent.processSpeech('Tell me more about how Workwise can help my business.');
    
    if (!workwiseResponse) {
      log.error('Failed to process speech with Workwise instructions');
      return false;
    }
    
    log.success(`Workwise response generated: "${workwiseResponse}"`);
    
    return true;
  } catch (error) {
    log.error(`Error testing AI Call Agent: ${error.message}`);
    if (error.stack) {
      log.info('Error stack trace:');
      console.error(error.stack);
    }
    return false;
  }
}

// Run tests
async function runTests() {
  log.highlight('AI Agent Test Suite');
  log.info('Running diagnostic tests to verify AI functionality...');
  
  const modelTestResult = await testGeminiModel();
  
  if (!modelTestResult) {
    log.error('Gemini model test failed. Cannot proceed with AI agent tests.');
    process.exit(1);
  }
  
  const agentTestResult = await testAICallAgent();
  
  if (modelTestResult && agentTestResult) {
    log.highlight('All tests passed successfully!');
    process.exit(0);
  } else {
    log.error('Some tests failed. Please review the logs for details.');
    process.exit(1);
  }
}

runTests(); 
#!/usr/bin/env node

/**
 * API Key Setup Script
 * This script helps users set up their API keys for the Prosparity AI application
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Get dirname in ESM context
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env.local');

// Log helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
  highlight: (msg) => console.log(`${colors.magenta}${colors.bold}${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
};

// Ask function (promisified readline.question)
function ask(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.cyan}${question}${colors.reset} `, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Read existing .env file if it exists
function readEnvFile(filePath) {
  if (!fileExists(filePath)) {
    return {};
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });
  
  return env;
}

// Write to .env file
function writeEnvFile(filePath, env) {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(filePath, content, 'utf8');
}

// Main function
async function main() {
  log.highlight('🔑 Prosparity AI API Key Setup Script 🔑');
  log.info('This script will help you set up the necessary API keys for the application.');
  log.info('The keys will be saved in the .env.local file.\n');
  
  // Read existing .env file if it exists
  const existingEnv = readEnvFile(envPath);
  
  // 1. Gemini API Key
  log.step('\n📋 Gemini API Key');
  log.info('The Gemini API key is required for AI features. You can get one from:');
  log.info('https://ai.google.dev/\n');
  
  const geminiApiKey = await ask(`Enter your Gemini API key${existingEnv.GEMINI_API_KEY ? ' (press Enter to keep existing)' : ''}:`);
  
  // 2. Supabase Configuration (optional)
  log.step('\n📋 Supabase Configuration (Optional)');
  log.info('Supabase is used for database functionality. You can get keys from:');
  log.info('https://supabase.com/\n');
  
  const supabaseUrl = await ask(`Enter your Supabase URL${existingEnv.NEXT_PUBLIC_SUPABASE_URL ? ' (press Enter to keep existing)' : ''}:`);
  const supabaseAnonKey = await ask(`Enter your Supabase Anon Key${existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ' (press Enter to keep existing)' : ''}:`);
  
  // 3. Twilio Configuration (optional)
  log.step('\n📋 Twilio Configuration (Optional)');
  log.info('Twilio is used for voice calls. You can get keys from:');
  log.info('https://www.twilio.com/\n');
  
  const twilioAccountSid = await ask(`Enter your Twilio Account SID${existingEnv.TWILIO_ACCOUNT_SID ? ' (press Enter to keep existing)' : ''}:`);
  const twilioAuthToken = await ask(`Enter your Twilio Auth Token${existingEnv.TWILIO_AUTH_TOKEN ? ' (press Enter to keep existing)' : ''}:`);
  const twilioPhoneNumber = await ask(`Enter your Twilio Phone Number${existingEnv.TWILIO_PHONE_NUMBER ? ' (press Enter to keep existing)' : ''}:`);
  
  // Build new env object
  const newEnv = {
    ...existingEnv,
    ...(geminiApiKey ? { GEMINI_API_KEY: geminiApiKey, NEXT_PUBLIC_GEMINI_API_KEY: geminiApiKey } : {}),
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseAnonKey ? { NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey } : {}),
    ...(twilioAccountSid ? { TWILIO_ACCOUNT_SID: twilioAccountSid } : {}),
    ...(twilioAuthToken ? { TWILIO_AUTH_TOKEN: twilioAuthToken } : {}),
    ...(twilioPhoneNumber ? { TWILIO_PHONE_NUMBER: twilioPhoneNumber } : {}),
  };
  
  // Write to .env.local file
  try {
    writeEnvFile(envPath, newEnv);
    log.success(`\n✅ API keys saved successfully to ${envPath}`);
    log.info('You can now run the application with these keys.');
  } catch (error) {
    log.error(`\n❌ Error saving API keys: ${error.message}`);
    log.info('You may need to create the .env.local file manually with the following content:');
    log.info(Object.entries(newEnv).map(([key, value]) => `${key}=${value}`).join('\n'));
  }
  
  log.step('\n📋 Next Steps');
  log.info('1. Make sure you have added your Gemini API key');
  log.info('2. Restart the application for the changes to take effect');
  log.info('3. Test the AI agent using the test script: node scripts/test-ai-agent.js');
  
  rl.close();
}

main().catch(error => {
  log.error(`\n❌ An error occurred: ${error.message}`);
  rl.close();
}); 
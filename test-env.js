// Load environment variables from .env file
require('dotenv').config();

console.log('Testing Twilio environment variables:');
console.log({
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || 'not set',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || 'not set',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || 'not set',
  NEXT_PUBLIC_TWILIO_PHONE_NUMBER: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || 'not set',
  NODE_ENV: process.env.NODE_ENV || 'not set'
}); 
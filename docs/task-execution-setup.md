# Task Execution Setup Guide

This guide will help you set up and test the task execution functionality, particularly for making calls using Twilio.

## Prerequisites

1. Twilio Account
2. Supabase Database
3. Your application running locally or deployed

## Step 1: Set Up Twilio

1. Sign up for a Twilio account at https://www.twilio.com/
2. Purchase a phone number or use a trial number
3. Note your Account SID and Auth Token from the Twilio dashboard

## Step 2: Configure Environment Variables

Create or update your `.env.local` file with the following variables:

```
# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Set Up Webhook URL in Twilio

1. Go to your Twilio phone number configuration
2. In the "Voice & Fax" section, set the "A CALL COMES IN" webhook to:
   - `https://your-app-url.com/api/twilio/voice`
   - If testing locally, use a service like ngrok to expose your local server

## Step 4: Apply Database Migrations

Run the migrations to ensure the database has the correct tables and constraints:

```bash
npx supabase migration up
```

## Step 5: Test the Task Execution

1. Create a new task with type "call"
2. Make sure the associated lead has a valid phone number
3. Click the "Execute" button on the task
4. Check the browser console for any error messages
5. Monitor the Twilio logs in your Twilio dashboard

## Troubleshooting

### Task execution is failing:

1. Check that the Twilio credentials are correct
2. Ensure the lead has a valid phone number
3. Verify that the callback URL is accessible from Twilio
4. Check the browser console and server logs for errors

### Call is initiated but no audio:

1. Verify that the TwiML response is correct
2. Check that the Twilio phone number has voice capabilities

### Database errors:

1. Ensure the call_logs table exists and has the correct schema
2. Verify that the task_id and lead_id are valid and exist in their respective tables

## Testing Without Real Calls

If you want to test without making real calls, modify the `executeCallTask` function to simulate a successful call:

```javascript
// Simulate a successful call
return { 
  success: true, 
  message: `Call initiated to ${lead.name}`,
  callSid: 'SIMULATED_CALL_SID'
};
``` 
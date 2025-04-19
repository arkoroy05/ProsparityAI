import twilio from 'twilio';

// Function to get environment variables with proper error handling
function getEnvVar(key) {
  const value = process.env[key];
  if (!value) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value;
}

// Initialize Twilio client
export function getTwilioClient() {
  const accountSid = getEnvVar('TWILIO_ACCOUNT_SID');
  const authToken = getEnvVar('TWILIO_AUTH_TOKEN');
  
  if (!accountSid || !authToken) {
    console.error('Twilio credentials are missing. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your environment variables.');
    return null;
  }
  
  return twilio(accountSid, authToken);
}

// Make a phone call using Twilio
export async function makeCall(to, from, callbackUrl, params = {}) {
  try {
    console.log('Making Twilio call:', {
      to,
      from,
      callbackUrl,
      params
    });
    
    // Validate phone numbers
    if (!to || !from) {
      console.error('Invalid phone numbers for Twilio call:', { to, from });
      return { error: 'Invalid phone numbers' };
    }
    
    // Format phone numbers to E.164 (if needed)
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    const formattedFrom = from.startsWith('+') ? from : `+${from}`;
    
    // Get Twilio client
    const client = getTwilioClient();
    if (!client) {
      return { error: 'Twilio client initialization failed' };
    }
    
    // Make the call
    const call = await client.calls.create({
      to: formattedTo,
      from: formattedFrom,
      url: callbackUrl,
      statusCallback: params.statusCallback,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true
    });
    
    console.log('Twilio call created:', {
      callSid: call.sid,
      status: call.status
    });
    
    return {
      success: true,
      callSid: call.sid,
      status: call.status
    };
  } catch (error) {
    console.error('Error making Twilio call:', error);
    return { 
      success: false,
      error: error.message || 'Failed to initiate call' 
    };
  }
}

// Send SMS using Twilio
export async function sendSMS(to, body, from = null) {
  try {
    // Validate inputs
    if (!to || !body) {
      console.error('Invalid parameters for SMS:', { to, body });
      return { error: 'Missing required parameters' };
    }
    
    // Format phone numbers
    const formattedTo = to.startsWith('+') ? to : `+${to}`;
    const formattedFrom = from || getEnvVar('NEXT_PUBLIC_TWILIO_PHONE_NUMBER');
    
    if (!formattedFrom) {
      return { error: 'Sender phone number not provided' };
    }
    
    // Get Twilio client
    const client = getTwilioClient();
    if (!client) {
      return { error: 'Twilio client initialization failed' };
    }
    
    // Send SMS
    const message = await client.messages.create({
      to: formattedTo,
      from: formattedFrom,
      body
    });
    
    console.log('SMS sent:', {
      messageSid: message.sid,
      status: message.status
    });
    
    return {
      success: true,
      messageSid: message.sid,
      status: message.status
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { 
      success: false,
      error: error.message || 'Failed to send SMS' 
    };
  }
} 
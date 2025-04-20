import twilio from 'twilio';
import { getEnvConfig } from './env-config';

// Initialize Twilio client
export const initTwilioClient = () => {
  try {
    const config = getEnvConfig();
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    return client;
  } catch (error) {
    console.error('Error initializing Twilio client:', error);
    return null;
  }
};

// Function to make a call
export const makeCall = async (to, from, callbackUrl) => {
  let client;
  // Clean phone numbers - moved outside try block
  const cleanTo = to.replace(/\D/g, '');
  const formattedTo = cleanTo.startsWith('91') ? `+${cleanTo}` : `+91${cleanTo}`;
  
  try {
    client = initTwilioClient();
    if (!client) {
      throw new Error('Twilio client not initialized - check credentials');
    }
    
    console.log('Making Twilio call:', {
      to: formattedTo,
      from,
      callbackUrl
    });

    const config = getEnvConfig();
    if (!config?.APP_URL) {
      throw new Error('APP_URL not configured in environment');
    }

    // Ensure URLs are properly formatted
    const statusCallbackUrl = config.APP_URL.endsWith('/') 
      ? config.APP_URL + 'api/twilio/status'
      : config.APP_URL + '/api/twilio/status';

    // Create call parameters
    const callParams = {
      to: formattedTo,
      from,
      url: callbackUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackMethod: 'POST'
    };

    // Add optional parameters only if they're supported
    try {
      const call = await client.calls.create({
        ...callParams,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        machineDetection: 'DetectMessageEnd',
        machineDetectionTimeout: 30,
        machineDetectionSpeechThreshold: 2000,
        machineDetectionSpeechEndThreshold: 1200,
        asyncAmd: true
      });

      return { 
        success: true, 
        callSid: call.sid,
        status: call.status
      };
    } catch (urlError) {
      // If the first attempt fails, try with minimal parameters
      console.log('First attempt failed, trying with minimal parameters');
      const simpleCall = await client.calls.create(callParams);
      
      return {
        success: true,
        callSid: simpleCall.sid,
        status: simpleCall.status
      };
    }
  } catch (error) {
    console.error('Error making Twilio call:', error);
    return {
      success: false,
      error: error.message || 'Failed to initiate call',
      details: error
    };
  }
};

// Function to send SMS
export const sendSMS = async (to, from, body) => {
  try {
    const client = initTwilioClient();
    if (!client) {
      throw new Error('Twilio client not initialized - check credentials');
    }
    
    // Clean and format the phone number
    const cleanPhone = to.replace(/\D/g, '');
    const formattedTo = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;
    
    const message = await client.messages.create({
      to: formattedTo,
      from,
      body,
    });
    
    return { 
      success: true, 
      messageSid: message.sid,
      status: message.status
    };
  } catch (error) {
    console.error('Error sending SMS:', {
      error: error.message,
      code: error.code,
      to,
      from,
      stack: error.stack
    });
    
    return { 
      success: false, 
      error: error.message || 'Failed to send SMS',
      details: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
    };
  }
};
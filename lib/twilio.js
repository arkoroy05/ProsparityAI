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
  try {
    const client = initTwilioClient();
    if (!client) {
      throw new Error('Twilio client not initialized - check credentials');
    }

    // Clean phone numbers
    const cleanTo = to.replace(/\D/g, '');
    const formattedTo = cleanTo.startsWith('91') ? `+${cleanTo}` : `+91${cleanTo}`;
    
    console.log('Making Twilio call:', {
      to: formattedTo,
      from,
      callbackUrl
    });

    const config = getEnvConfig();
    if (!config?.APP_URL) {
      throw new Error('APP_URL not configured in environment');
    }

    // Create call without any URL constructor usage
    const call = await client.calls.create({
      to: formattedTo,
      from,
      url: callbackUrl,
      statusCallback: config.APP_URL + '/api/twilio/status',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      machineDetection: 'DetectMessageEnd', // Changed to use string enum
      machineDetectionTimeout: 30,
      machineDetectionSpeechThreshold: 2000,
      machineDetectionSpeechEndThreshold: 1200,
      asyncAmd: true // Changed to boolean
    });

    return { 
      success: true, 
      callSid: call.sid,
      status: call.status
    };
  } catch (error) {
    // If there's a URL constructor error, try alternate approach
    if (error.message?.includes('URL is not a constructor')) {
      try {
        const simpleCall = await client.calls.create({
          to: formattedTo,
          from,
          url: callbackUrl,
          statusCallback: config.APP_URL + '/api/twilio/status'
        });

        return {
          success: true,
          callSid: simpleCall.sid,
          status: simpleCall.status
        };
      } catch (retryError) {
        console.error('Error in retry attempt:', retryError);
        return {
          success: false,
          error: retryError.message || 'Failed to initiate call (retry)',
          details: {
            code: retryError.code,
            status: retryError.status,
            moreInfo: retryError.moreInfo
          }
        };
      }
    }

    console.error('Error making Twilio call:', {
      error: error.message,
      code: error.code,
      to,
      from,
      stack: error.stack
    });
    
    return { 
      success: false, 
      error: error.message || 'Failed to initiate call',
      details: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
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
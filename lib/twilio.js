import twilio from 'twilio';
import { getEnvConfig } from './env-config';
import { URL } from 'url';

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

    // Strip any trailing slashes from URLs
    const cleanCallbackUrl = callbackUrl.replace(/\/+$/, '');
    const cleanBaseUrl = config.APP_URL.replace(/\/+$/, '');

    // Basic required parameters only
    const callParams = {
      to: formattedTo,
      from: from,
      url: cleanCallbackUrl,
      statusCallback: `${cleanBaseUrl}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      record: true // Enable call recording for quality
    };

    console.log('Attempting call with parameters:', callParams);

    const call = await client.calls.create(callParams);
    
    console.log('Call created successfully:', {
      callSid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from
    });
    
    return { 
      success: true, 
      callSid: call.sid,
      status: call.status
    };

  } catch (error) {
    console.error('Error making Twilio call:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status
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
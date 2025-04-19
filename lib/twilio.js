import twilio from 'twilio';

// Initialize Twilio client
// Note: In a production environment, these should be stored in environment variables
export const initTwilioClient = () => {
  try {
    // Load directly from process.env with explicit console logging
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    // Print debug info to help troubleshoot
    console.log('DEBUG - Twilio Environment Variables:', {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'missing',
      TWILIO_ACCOUNT_SID_PREFIX: accountSid ? accountSid.substring(0, 4) : 'missing',
      TWILIO_AUTH_TOKEN_PREFIX: authToken ? authToken.substring(0, 4) : 'missing',
      NEXT_PUBLIC_TWILIO_PHONE_NUMBER: process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER || 'missing'
    });
    
    if (!accountSid || !authToken) {
      console.error('Missing Twilio credentials:', {
        hasSid: !!accountSid,
        hasToken: !!authToken
      });
      return null;
    }
    
    // Force-load the twilio library here
    const client = require('twilio')(accountSid, authToken);
    console.log('Twilio client initialized successfully');
    return client;
  } catch (error) {
    console.error('Error initializing Twilio client:', error);
    return null;
  }
};

// Function to make a call
export const makeCall = async (to, from, callbackUrl, params = {}) => {
  try {
    console.log('Initiating outbound AI call with params:', {
      to,
      from,
      callbackUrl,
      params
    });

    const client = initTwilioClient();
    if (!client) {
      throw new Error('Twilio client not initialized - check credentials');
    }

    // Clean and format the phone number
    const cleanPhone = to.replace(/\D/g, '');
    const formattedTo = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
    // Build URL with parameters - ensure leadName and other required params are passed
    const urlWithParams = new URL(callbackUrl);
    
    // Always include these important parameters for the AI agent
    const essentialParams = {
      isOutbound: 'true',
      ...params
    };
    
    Object.entries(essentialParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlWithParams.searchParams.append(key, value);
      }
    });

    console.log('Making Twilio outbound call with:', {
      to: formattedTo,
      from,
      url: urlWithParams.toString(),
      leadName: params.leadName || 'Unknown'
    });
    
    const call = await client.calls.create({
      to: formattedTo,
      from,
      url: urlWithParams.toString(),
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      machineDetection: 'Enable', // Detect answering machines
      machineDetectionTimeout: 30,
      machineDetectionSpeechThreshold: 2000,
      machineDetectionSpeechEndThreshold: 1200,
      asyncAmd: true // Use async answering machine detection
    });
    
    console.log('Outbound AI call initiated successfully:', {
      callSid: call.sid,
      status: call.status,
      to: formattedTo,
      timestamp: new Date().toISOString()
    });
    
    return { 
      success: true, 
      callSid: call.sid,
      status: call.status
    };
  } catch (error) {
    console.error('Error initiating outbound AI call:', {
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status,
      to: to,
      timestamp: new Date().toISOString()
    });
    
    return { 
      success: false, 
      error: error.message,
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
    const formattedTo = cleanPhone.startsWith('1') ? `+${cleanPhone}` : `+1${cleanPhone}`;
    
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
      moreInfo: error.moreInfo,
      status: error.status
    });
    
    return { 
      success: false, 
      error: error.message,
      details: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
    };
  }
}; 
import twilio from 'twilio';

// Initialize Twilio client
// Note: In a production environment, these should be stored in environment variables
export const initTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('Missing Twilio credentials:', {
      hasSid: !!accountSid,
      hasToken: !!authToken
    });
    return null;
  }
  
  return twilio(accountSid, authToken);
};

// Function to make a call
export const makeCall = async (to, from, callbackUrl, params = {}) => {
  try {
    console.log('Making call with params:', {
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
    
    // Build URL with parameters
    const urlWithParams = new URL(callbackUrl);
    Object.entries(params).forEach(([key, value]) => {
      urlWithParams.searchParams.append(key, value);
    });

    console.log('Initiating Twilio call with:', {
      to: formattedTo,
      from,
      url: urlWithParams.toString()
    });
    
    const call = await client.calls.create({
      to: formattedTo,
      from,
      url: urlWithParams.toString(),
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    });
    
    console.log('Call initiated successfully:', {
      callSid: call.sid,
      status: call.status
    });
    
    return { 
      success: true, 
      callSid: call.sid,
      status: call.status
    };
  } catch (error) {
    console.error('Error making call:', {
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
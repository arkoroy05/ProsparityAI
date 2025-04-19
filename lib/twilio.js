import twilio from 'twilio';

// Initialize Twilio client
// Note: In a production environment, these should be stored in environment variables
export const initTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('Missing Twilio credentials');
    return null;
  }
  
  return twilio(accountSid, authToken);
};

// Function to make a call
export const makeCall = async (to, from, callbackUrl) => {
  const client = initTwilioClient();
  if (!client) return { error: 'Twilio client not initialized' };
  
  try {
    const call = await client.calls.create({
      to,
      from,
      url: callbackUrl, // URL to TwiML script that defines call behavior
    });
    
    return { success: true, callSid: call.sid };
  } catch (error) {
    console.error('Error making call:', error);
    return { error: error.message };
  }
};

// Function to send SMS
export const sendSMS = async (to, from, body) => {
  const client = initTwilioClient();
  if (!client) return { error: 'Twilio client not initialized' };
  
  try {
    const message = await client.messages.create({
      to,
      from,
      body,
    });
    
    return { success: true, messageSid: message.sid };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { error: error.message };
  }
}; 
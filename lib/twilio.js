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
export const makeCall = async (to, from, taskId, leadId, leadName, companyId) => {
  try {
    const config = getEnvConfig();
    if (!config?.APP_URL) {
      throw new Error('APP_URL not configured in environment');
    }

    console.log('Initiating call through server:', {
      to,
      from,
      taskId,
      leadId,
      leadName
    });

    const response = await fetch(`${config.APP_URL}/api/twilio/make-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from,
        taskId,
        leadId,
        leadName,
        companyId
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to initiate call');
    }

    return data;
  } catch (error) {
    console.error('Error initiating call:', error);
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
    const config = getEnvConfig();
    if (!config?.APP_URL) {
      throw new Error('APP_URL not configured in environment');
    }

    const response = await fetch(`${config.APP_URL}/api/twilio/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        from,
        body
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to send SMS');
    }

    return data;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
      details: error
    };
  }
};
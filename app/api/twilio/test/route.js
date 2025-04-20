import { NextResponse } from 'next/server';
import { initTwilioClient } from '@/lib/twilio';

export async function GET() {
  try {
    // Check environment variables
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || process.env.NEXT_PUBLIC_TWILIO_PHONE_NUMBER;
    const simulationMode = process.env.NEXT_PUBLIC_TWILIO_SIMULATION;
    
    // Attempt to initialize Twilio client
    const client = initTwilioClient();
    
    return NextResponse.json({
      success: !!client,
      environmentCheck: {
        hasSid: !!twilioAccountSid,
        hasToken: !!twilioAuthToken,
        hasPhoneNumber: !!twilioPhoneNumber,
        simulationMode
      },
      clientInitialized: !!client,
      message: client ? 'Twilio client initialized successfully' : 'Failed to initialize Twilio client'
    });
  } catch (error) {
    console.error('Error in Twilio test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
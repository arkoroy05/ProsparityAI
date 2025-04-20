import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getEnvConfig } from '@/lib/env-config';

export async function POST(request) {
  try {
    const config = getEnvConfig();
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    
    // Get request body
    const body = await request.json();
    const { to, from, body: messageBody } = body;

    if (!to || !from || !messageBody) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Clean phone numbers
    const cleanPhone = to.replace(/\D/g, '');
    const formattedTo = cleanPhone.startsWith('91') ? `+${cleanPhone}` : `+91${cleanPhone}`;

    const message = await client.messages.create({
      to: formattedTo,
      from,
      body: messageBody,
    });

    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      status: message.status
    });

  } catch (error) {
    console.error('Error sending SMS:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send SMS',
      details: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
    }, { status: 500 });
  }
} 
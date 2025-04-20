import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { getEnvConfig } from '@/lib/env-config';
import { URL } from 'url';

export async function POST(request) {
  try {
    const config = getEnvConfig();
    const client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    
    // Get request body
    const body = await request.json();
    const { to, from, taskId, leadId, leadName, companyId } = body;

    if (!to || !from) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    // Clean phone numbers
    const cleanTo = to.replace(/\D/g, '');
    const formattedTo = cleanTo.startsWith('91') ? `+${cleanTo}` : `+91${cleanTo}`;

    // Construct callback URL with query parameters
    const voiceCallbackUrl = new URL('/api/twilio/voice', config.APP_URL);
    voiceCallbackUrl.searchParams.append('taskId', taskId);
    voiceCallbackUrl.searchParams.append('leadId', leadId);
    voiceCallbackUrl.searchParams.append('leadName', leadName);
    voiceCallbackUrl.searchParams.append('companyId', companyId);

    // Create call parameters
    const callParams = {
      to: formattedTo,
      from,
      url: voiceCallbackUrl.toString(),
      statusCallback: `${config.APP_URL}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true
    };

    console.log('Making Twilio call with params:', callParams);

    const call = await client.calls.create(callParams);
    
    console.log('Call created successfully:', {
      callSid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status
    });

  } catch (error) {
    console.error('Error making Twilio call:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status
    });

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initiate call',
      details: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
    }, { status: 500 });
  }
} 
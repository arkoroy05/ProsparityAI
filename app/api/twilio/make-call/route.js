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

    // Validate Twilio credentials
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      console.error('Missing Twilio credentials');
      return NextResponse.json({
        success: false,
        error: 'Twilio configuration error'
      }, { status: 500 });
    }

    // Clean and validate phone numbers
    const cleanTo = to.replace(/\D/g, '');
    if (cleanTo.length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Invalid phone number format'
      }, { status: 400 });
    }

    const formattedTo = cleanTo.startsWith('91') ? `+${cleanTo}` : `+91${cleanTo}`;

    // Validate required parameters for AI call
    if (!leadId) {
      console.warn('Making call without leadId - AI features will be limited');
    }

    // Construct callback URL with query parameters
    const voiceCallbackUrl = new URL('/api/twilio/voice', config.APP_URL);

    // Add all available parameters, but don't fail if some are missing
    if (taskId) voiceCallbackUrl.searchParams.append('taskId', taskId);
    if (leadId) voiceCallbackUrl.searchParams.append('leadId', leadId);
    if (leadName) voiceCallbackUrl.searchParams.append('leadName', leadName);
    if (companyId) voiceCallbackUrl.searchParams.append('companyId', companyId);

    // Create call parameters with improved error handling
    const callParams = {
      to: formattedTo,
      from,
      url: voiceCallbackUrl.toString(),
      statusCallback: `${config.APP_URL}/api/twilio/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true,
      recordingStatusCallback: `${config.APP_URL}/api/twilio/recording-callback`,
      recordingStatusCallbackMethod: 'POST',
      timeout: 30, // 30 seconds to allow for connection
      machineDetection: 'Enable', // Detect answering machines
      machineDetectionTimeout: 10, // 10 seconds to detect machine
      machineDetectionSpeechThreshold: 2000, // 2 seconds of silence before detection
      machineDetectionSpeechEndThreshold: 1200, // 1.2 seconds of silence to determine end of greeting
      amdStatusCallback: `${config.APP_URL}/api/twilio/amd-status` // Answering machine detection callback
    };

    console.log('Making Twilio call with params:', {
      to: callParams.to,
      from: callParams.from,
      url: callParams.url,
      statusCallback: callParams.statusCallback
    });

    try {
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
    } catch (twilioError) {
      console.error('Twilio API error:', twilioError);
      return NextResponse.json({
        success: false,
        error: `Twilio API error: ${twilioError.message}`,
        details: {
          code: twilioError.code,
          status: twilioError.status,
          moreInfo: twilioError.moreInfo
        }
      }, { status: 500 });
    }

  } catch (error) {
    // This catch block handles any errors not caught by the Twilio API call
    console.error('Unexpected error making Twilio call:', {
      message: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to initiate call',
      details: {
        type: error.constructor.name,
        location: 'make-call route handler'
      }
    }, { status: 500 });
  }
}
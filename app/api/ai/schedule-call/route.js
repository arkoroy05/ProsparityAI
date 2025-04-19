import { NextResponse } from 'next/server';
import { aiAgent } from '@/lib/ai-agent';

export async function POST(request) {
  try {
    const { leadInfo, companyInfo, scheduledTime } = await request.json();

    if (!leadInfo || !companyInfo || !scheduledTime) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const result = await aiAgent.execute(
      `Schedule a call with ${leadInfo.name} for ${new Date(scheduledTime).toLocaleString()}`,
      { leadInfo, companyInfo, scheduledTime }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error scheduling call:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
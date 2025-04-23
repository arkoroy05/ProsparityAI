import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with the service role key
// This allows us to bypass RLS policies for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to handle errors consistently
const handleApiError = (error, message, status = 500) => {
  console.error(`API Error (${message}):`, error);
  return NextResponse.json({
    success: false,
    message: message,
    details: error.message,
    code: error.code
  }, { status });
};

export async function POST(request) {
  try {
    // Parse the request body
    let companyId;
    try {
      const body = await request.json();
      companyId = body.companyId;
      
      if (!companyId) {
        return NextResponse.json({
          success: false,
          message: 'Company ID is required'
        }, { status: 400 });
      }
      
      console.log('Processing settings init for company:', companyId);
    } catch (parseError) {
      return handleApiError(parseError, 'Invalid request format', 400);
    }

    // Check if the company exists
    try {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('id', companyId)
        .single();

      if (companyError) {
        throw companyError;
      }

      if (!company) {
        return NextResponse.json({
          success: false,
          message: 'Company not found'
        }, { status: 404 });
      }
      
      console.log('Company found, checking for existing settings');
    } catch (companyError) {
      return handleApiError(companyError, 'Error verifying company', 500);
    }

    // Use a transaction to safely check and create settings if needed
    try {
      // First check if settings exist
      const { data: existingSettings, error: checkError } = await supabaseAdmin
        .from('company_settings')
        .select('id, ai_instructions')
        .eq('company_id', companyId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // If settings already exist, return them
      if (existingSettings?.id) {
        console.log('Existing settings found, returning');
        return NextResponse.json({
          success: true,
          message: 'Settings already exist',
          settings: existingSettings
        });
      }

      console.log('No settings found, creating new settings record');
      
      // Create new settings if they don't exist
      const { data: newSettings, error: createError } = await supabaseAdmin
        .from('company_settings')
        .insert({
          company_id: companyId,
          ai_instructions: '',
          call_settings: {},
          email_settings: {},
          notification_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      if (!newSettings) {
        throw new Error('Failed to create settings - no data returned');
      }

      console.log('New settings created successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Settings initialized successfully',
        settings: newSettings
      });
    } catch (dbError) {
      return handleApiError(dbError, 'Database operation failed', 500);
    }
  } catch (unexpectedError) {
    return handleApiError(unexpectedError, 'Unexpected error occurred', 500);
  }
} 
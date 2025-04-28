import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    // Create Supabase client directly for server component
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
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
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select(`
          id, 
          name, 
          owner_id,
          user_companies (
            user_id,
            role
          )
        `)
        .eq('id', companyId)
        .limit(1);

      if (companyError) {
        throw companyError;
      }

      if (!companies || companies.length === 0 || !companies[0].user_companies?.length) {
        // In development mode, try to create a dummy company
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Creating dummy company for ID:', companyId);
          
          try {
            // Try to get authenticated user, but don't require it in development
            let ownerId;
            
            try {
              const { data, error: userError } = await supabase.auth.getUser();
              
              if (!userError && data?.user?.id) {
                ownerId = data.user.id;
                console.log('Using authenticated user as owner:', ownerId);
              } else {
                // Generate a development owner ID if no authenticated user
                ownerId = '00000000-0000-0000-0000-000000000000';
                console.log('No authenticated user found, using development owner ID');
              }
            } catch (authError) {
              console.log('Auth error, using development owner ID:', authError);
              ownerId = '00000000-0000-0000-0000-000000000000';
            }
            
            // In development mode, use direct SQL query to bypass RLS
            const { data: newCompany, error: createError } = await supabase.rpc(
              'create_development_company',
              { 
                company_id: companyId,
                owner_id: ownerId,
                company_name: 'Development Company',
                company_description: 'Automatically created development company'
              }
            );
            
            if (createError) {
              console.error('Failed to create development company:', createError);
              
              // Fallback to local storage mode
              return NextResponse.json({
                success: true, // Return success with empty settings to trigger fallback
                message: 'Using development fallback',
                settings: { ai_instructions: '' },
                fallback: true
              });
            }
            
            console.log('Created development company:', newCompany);
          } catch (devError) {
            console.error('Error in development company creation:', devError);
            return NextResponse.json({
              success: false,
              message: 'Error creating development company',
              details: devError.message
            }, { status: 500 });
          }
        } else {
          return NextResponse.json({
            success: false,
            message: 'Company not found',
            details: `No company found with ID: ${companyId}`
          }, { status: 404 });
        }
      }
      
      console.log('Company found, checking for existing settings');
    } catch (companyError) {
      return handleApiError(companyError, 'Error verifying company', 500);
    }

    // Use a transaction to safely check and create settings if needed
    try {
      // Check if this is development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Using direct RPC for settings');
        // Use RPC to bypass RLS in development
        const { data: settings, error: settingsError } = await supabase.rpc(
          'init_company_settings',
          { p_company_id: companyId }
        );
        
        if (settingsError) {
          console.error('Failed to initialize settings via RPC:', settingsError);
          return NextResponse.json({
            success: true, // Return success with empty settings to trigger fallback
            message: 'Using development fallback',
            settings: { ai_instructions: '' },
            fallback: true
          });
        }
        
        return NextResponse.json({
          success: true,
          message: 'Settings initialized successfully via RPC',
          settings
        });
      }
      
      // Normal flow for production - First check if settings exist
      const { data: existingSettings, error: checkError } = await supabase
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
      const { data: newSettings, error: createError } = await supabase
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
import { NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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
    // Create authenticated Supabase client
    const supabase = createServerActionClient({ cookies });
    
    // Parse the request body
    let companyId, instructions;
    try {
      const body = await request.json();
      companyId = body.companyId;
      instructions = body.instructions;
      
      if (!companyId) {
        return NextResponse.json({
          success: false,
          message: 'Company ID is required'
        }, { status: 400 });
      }
      
      console.log('Saving settings for company:', companyId);
    } catch (parseError) {
      return handleApiError(parseError, 'Invalid request format', 400);
    }

    // Check if the company exists
    try {
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('id, name, owner_id')
        .eq('id', companyId)
        .limit(1);

      if (companyError) {
        throw companyError;
      }

      if (!companies || companies.length === 0) {
        // In development mode, try to create the company first
        if (process.env.NODE_ENV === 'development') {
          console.log('Development mode: Company not found, creating it first');
          
          try {
            // Get current user or use fallback ID
            let ownerId;
            try {
              const { data, error: userError } = await supabase.auth.getUser();
              if (!userError && data?.user?.id) {
                ownerId = data.user.id;
              } else {
                ownerId = '00000000-0000-0000-0000-000000000000';
              }
            } catch (authError) {
              console.warn('Auth error, using development ID:', authError);
              ownerId = '00000000-0000-0000-0000-000000000000';
            }
            
            // Try to create the company using RPC
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
              return NextResponse.json({
                success: false,
                message: 'Company not found and could not create development company',
                details: createError.message
              }, { status: 404 });
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
    } catch (companyError) {
      return handleApiError(companyError, 'Error verifying company', 500);
    }

    // Try to save settings - check if in development mode
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('Development mode: Using RPC to save settings');
        // Use the RPC to save settings
        const { data: settings, error: rpcError } = await supabase.rpc(
          'save_company_settings',
          { 
            p_company_id: companyId,
            p_ai_instructions: instructions || ''
          }
        );
        
        if (rpcError) {
          console.error('RPC error when saving settings:', rpcError);
          // Try regular approach as fallback
        } else {
          return NextResponse.json({
            success: true,
            message: 'Settings saved successfully via RPC',
            instructions: instructions
          });
        }
      } catch (rpcError) {
        console.error('Error using RPC to save settings:', rpcError);
        // Continue to regular approach as fallback
      }
    }
    
    // Regular approach - update settings using normal query
    try {
      // First check if settings exist
      const { data: existingSettings, error: checkError } = await supabase
        .from('company_settings')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      let updateResult;
      
      if (existingSettings?.id) {
        // Update existing settings
        updateResult = await supabase
          .from('company_settings')
          .update({
            ai_instructions: instructions || '',
            updated_at: new Date().toISOString()
          })
          .eq('company_id', companyId)
          .select();
      } else {
        // Create new settings
        updateResult = await supabase
          .from('company_settings')
          .insert({
            company_id: companyId,
            ai_instructions: instructions || '',
            call_settings: {},
            email_settings: {},
            notification_settings: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
      }
      
      if (updateResult.error) {
        throw updateResult.error;
      }

      return NextResponse.json({
        success: true,
        message: 'Settings saved successfully',
        instructions: instructions
      });
    } catch (dbError) {
      return handleApiError(dbError, 'Failed to save settings', 500);
    }
  } catch (unexpectedError) {
    return handleApiError(unexpectedError, 'Unexpected error occurred', 500);
  }
} 
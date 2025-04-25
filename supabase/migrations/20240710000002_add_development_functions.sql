-- Create a function to bypass RLS for development purposes
-- This function will be executed with security definer permissions
CREATE OR REPLACE FUNCTION create_development_company(
  company_id UUID,
  owner_id UUID,
  company_name TEXT,
  company_description TEXT DEFAULT 'Development Company'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- First check if the company already exists
  IF EXISTS (SELECT 1 FROM companies WHERE id = company_id) THEN
    SELECT jsonb_build_object(
      'id', companies.id,
      'name', companies.name,
      'owner_id', companies.owner_id,
      'description', companies.description
    ) INTO result
    FROM companies
    WHERE companies.id = company_id;
    
    RETURN result;
  END IF;
  
  -- Insert the company
  INSERT INTO companies (
    id,
    name,
    owner_id,
    description,
    created_at,
    updated_at
  ) VALUES (
    company_id,
    company_name,
    owner_id,
    company_description,
    now(),
    now()
  )
  RETURNING jsonb_build_object(
    'id', companies.id,
    'name', companies.name,
    'owner_id', companies.owner_id,
    'description', companies.description
  ) INTO result;
  
  -- Create a user_companies entry to ensure proper access
  INSERT INTO user_companies (
    user_id,
    company_id,
    role,
    created_at,
    updated_at
  ) VALUES (
    owner_id,
    company_id,
    'owner',
    now(),
    now()
  )
  ON CONFLICT (user_id, company_id) DO NOTHING;
  
  RETURN result;
END;
$$;

-- Create a function to initialize company settings
CREATE OR REPLACE FUNCTION init_company_settings(
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- First check if settings already exist
  IF EXISTS (SELECT 1 FROM company_settings WHERE company_id = p_company_id) THEN
    SELECT jsonb_build_object(
      'id', company_settings.id,
      'company_id', company_settings.company_id,
      'ai_instructions', company_settings.ai_instructions
    ) INTO result
    FROM company_settings
    WHERE company_settings.company_id = p_company_id;
    
    RETURN result;
  END IF;
  
  -- Insert new settings
  INSERT INTO company_settings (
    company_id,
    ai_instructions,
    call_settings,
    email_settings,
    notification_settings,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    '',
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
  RETURNING jsonb_build_object(
    'id', company_settings.id,
    'company_id', company_settings.company_id,
    'ai_instructions', company_settings.ai_instructions
  ) INTO result;
  
  RETURN result;
END;
$$; 
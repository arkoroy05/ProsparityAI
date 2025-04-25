-- Create a function to save company settings safely by bypassing RLS
CREATE OR REPLACE FUNCTION save_company_settings(
  p_company_id UUID,
  p_ai_instructions TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  settings_id UUID;
BEGIN
  -- First check if settings already exist
  SELECT id INTO settings_id
  FROM company_settings
  WHERE company_id = p_company_id;
  
  IF settings_id IS NOT NULL THEN
    -- Update existing settings
    UPDATE company_settings
    SET 
      ai_instructions = p_ai_instructions,
      updated_at = now()
    WHERE id = settings_id
    RETURNING jsonb_build_object(
      'id', company_settings.id,
      'company_id', company_settings.company_id,
      'ai_instructions', company_settings.ai_instructions
    ) INTO result;
  ELSE
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
      p_ai_instructions,
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
  END IF;
  
  RETURN result;
END;
$$; 
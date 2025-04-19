-- Create company_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ai_instructions TEXT DEFAULT '',
  call_settings JSONB DEFAULT '{}'::jsonb,
  email_settings JSONB DEFAULT '{}'::jsonb,
  notification_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION set_company_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_company_settings_updated_at ON company_settings;
CREATE TRIGGER set_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_company_settings_updated_at();

-- Enable Row Level Security
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view company settings they belong to" ON company_settings;
DROP POLICY IF EXISTS "Users can insert company settings they belong to" ON company_settings;
DROP POLICY IF EXISTS "Users can update company settings they belong to" ON company_settings;

-- Create RLS Policies
CREATE POLICY "Users can view company settings for their companies"
  ON company_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert company settings for their companies"
  ON company_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update company settings for their companies"
  ON company_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = company_settings.company_id
      AND companies.owner_id = auth.uid()
    )
  ); 
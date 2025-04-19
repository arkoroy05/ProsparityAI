-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_leads_updated_at ON leads;

-- Add missing columns to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS score INTEGER,
ADD COLUMN IF NOT EXISTS classification TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add trigger for updating updated_at timestamp
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view leads from their company" ON leads;
DROP POLICY IF EXISTS "Users can insert leads for their company" ON leads;
DROP POLICY IF EXISTS "Users can update leads from their company" ON leads;
DROP POLICY IF EXISTS "Users can delete leads from their company" ON leads;

-- Update RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy for viewing leads
CREATE POLICY "Users can view leads from their company"
  ON leads FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Policy for inserting leads
CREATE POLICY "Users can insert leads for their company"
  ON leads FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Policy for updating leads
CREATE POLICY "Users can update leads from their company"
  ON leads FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

-- Policy for deleting leads
CREATE POLICY "Users can delete leads from their company"
  ON leads FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  ); 
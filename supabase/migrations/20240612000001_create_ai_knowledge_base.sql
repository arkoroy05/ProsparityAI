-- Create AI knowledge base table
CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  products JSONB DEFAULT '[]',
  services JSONB DEFAULT '[]',
  company_info TEXT,
  sales_instructions TEXT,
  last_processed TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries by company
CREATE INDEX IF NOT EXISTS ai_knowledge_base_company_id_idx ON ai_knowledge_base(company_id);

-- Create RLS policies
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Policy for selecting knowledge base
CREATE POLICY select_knowledge_base ON ai_knowledge_base
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM company_users WHERE company_id = ai_knowledge_base.company_id
    )
  );

-- Policy for inserting knowledge base
CREATE POLICY insert_knowledge_base ON ai_knowledge_base
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM company_users 
      WHERE company_id = ai_knowledge_base.company_id 
      AND role IN ('admin', 'owner')
    )
  );

-- Policy for updating knowledge base
CREATE POLICY update_knowledge_base ON ai_knowledge_base
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM company_users 
      WHERE company_id = ai_knowledge_base.company_id 
      AND role IN ('admin', 'owner')
    )
  );

-- Add ai_insights column to the leads table if it doesn't exist
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}'::jsonb; 
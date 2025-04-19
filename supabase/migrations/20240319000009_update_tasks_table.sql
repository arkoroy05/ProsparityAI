-- Drop existing check constraint if it exists
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Add missing columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) NOT NULL,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) NOT NULL,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' NOT NULL,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 3 NOT NULL CHECK (priority >= 1 AND priority <= 5),
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS title TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS ai_instructions TEXT;

-- Add trigger for updating updated_at timestamp
DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;

CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view tasks from their company" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks for their company" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks from their company" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks from their company" ON tasks;

-- Create RLS policies
CREATE POLICY "Users can view tasks from their company"
  ON tasks FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks for their company"
  ON tasks FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks from their company"
  ON tasks FOR UPDATE
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

CREATE POLICY "Users can delete tasks from their company"
  ON tasks FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_companies
      WHERE user_id = auth.uid()
    )
  ); 
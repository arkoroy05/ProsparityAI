-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE IF EXISTS tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Create tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  lead_id UUID,
  company_id UUID,
  assigned_to UUID,
  created_by UUID,
  ai_instructions TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  notes JSONB DEFAULT '[]'::jsonb
);

-- Update any existing text priority values to integers
DO $$
BEGIN
  -- Try to convert any text priorities to integers
  UPDATE tasks 
  SET priority = CASE 
    WHEN priority::text ~ '^[0-9]+$' THEN priority::text::integer
    ELSE 3  -- Default to 3 if conversion fails
  END
  WHERE priority IS NOT NULL;
EXCEPTION
  WHEN others THEN
    -- If update fails, set all priorities to default
    UPDATE tasks SET priority = 3;
END $$;

-- Add constraints
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority >= 1 AND priority <= 5);

-- Create indexes
CREATE INDEX IF NOT EXISTS tasks_lead_id_idx ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS tasks_company_id_idx ON tasks(company_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_scheduled_at_idx ON tasks(scheduled_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION set_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_tasks_updated_at ON tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_tasks_updated_at(); 
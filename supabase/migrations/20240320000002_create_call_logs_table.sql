-- Create call_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_sid TEXT,
  task_id UUID,
  lead_id UUID,
  status TEXT,
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create an index on call_sid for faster lookups
CREATE INDEX IF NOT EXISTS call_logs_call_sid_idx ON call_logs(call_sid);

-- Create an index on task_id for faster lookups
CREATE INDEX IF NOT EXISTS call_logs_task_id_idx ON call_logs(task_id);

-- Create an index on lead_id for faster lookups
CREATE INDEX IF NOT EXISTS call_logs_lead_id_idx ON call_logs(lead_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION set_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_call_logs_updated_at ON call_logs;
CREATE TRIGGER set_call_logs_updated_at
BEFORE UPDATE ON call_logs
FOR EACH ROW
EXECUTE FUNCTION set_call_logs_updated_at(); 
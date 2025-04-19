-- Drop existing table and related objects
DROP TRIGGER IF EXISTS set_call_logs_updated_at ON call_logs;
DROP FUNCTION IF EXISTS set_call_logs_updated_at();
DROP TABLE IF EXISTS call_logs;

-- Create the table fresh
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_sid TEXT,
  task_id UUID,
  lead_id UUID,
  status TEXT,
  notes JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX call_logs_call_sid_idx ON call_logs(call_sid);
CREATE INDEX call_logs_task_id_idx ON call_logs(task_id);
CREATE INDEX call_logs_lead_id_idx ON call_logs(lead_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION set_call_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER set_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_call_logs_updated_at(); 
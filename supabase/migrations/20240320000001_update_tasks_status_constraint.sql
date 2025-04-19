-- Update the tasks status constraint to match the UI values
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the new constraint with the correct spelling of 'canceled'
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'canceled'));

-- Update any existing rows with 'cancelled' to 'canceled'
UPDATE tasks SET status = 'canceled' WHERE status = 'cancelled'; 
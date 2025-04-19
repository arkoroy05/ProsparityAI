-- Add scheduling and priority fields to tasks table
ALTER TABLE public.tasks
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;

-- Create index for scheduled tasks
CREATE INDEX idx_tasks_scheduled_at ON public.tasks(scheduled_at);

-- Update RLS policies to include new columns
DROP POLICY IF EXISTS "Users can view tasks from their companies" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks for their companies" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks from their companies" ON public.tasks;

CREATE POLICY "Users can view tasks from their companies"
ON public.tasks
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.user_companies
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create tasks for their companies"
ON public.tasks
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.user_companies
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks from their companies"
ON public.tasks
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.user_companies
    WHERE user_id = auth.uid()
  )
); 
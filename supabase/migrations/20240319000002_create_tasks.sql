-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'follow-up', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    ai_instructions TEXT,
    additional_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks table
CREATE POLICY "Users can view tasks from their companies"
    ON public.tasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.company_id = tasks.company_id
        )
    );

CREATE POLICY "Users can create tasks for their companies"
    ON public.tasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.company_id = tasks.company_id
        )
    );

CREATE POLICY "Users can update tasks from their companies"
    ON public.tasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.company_id = tasks.company_id
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
-- Ensure call_logs table exists and has required columns
DO $$ 
BEGIN
    -- Check if table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'call_logs' AND schemaname = 'public') THEN
        CREATE TABLE public.call_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
            lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
            call_sid TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'pending',
            duration INTEGER DEFAULT 0,
            recording_url TEXT,
            script TEXT,
            notes TEXT,
            sentiment_score FLOAT DEFAULT 0,
            metadata JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT valid_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
            CONSTRAINT valid_sentiment_score CHECK (sentiment_score >= -1 AND sentiment_score <= 1)
        );

        -- Enable RLS
        ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
    END IF;

    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'call_logs' 
        AND column_name = 'company_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.call_logs 
        ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Modify RLS policies for call_logs table to allow access during call creation
DROP POLICY IF EXISTS "Users can create call logs for their companies" ON public.call_logs;

-- Create a more permissive policy for creating call logs
CREATE POLICY "Users can create call logs for their companies"
ON public.call_logs
FOR INSERT
WITH CHECK (
    -- Check if user belongs to company OR if it's coming from dev env OR from backend
    (company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    ))
    OR current_setting('app.environment', true) = 'development'
    OR current_setting('app.bypass_rls', true) = 'true'
);

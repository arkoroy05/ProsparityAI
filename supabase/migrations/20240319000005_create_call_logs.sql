-- Create call logs table
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

-- Create policies
CREATE POLICY "Users can view call logs from their companies"
ON public.call_logs
FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create call logs for their companies"
ON public.call_logs
FOR INSERT
WITH CHECK (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update call logs from their companies"
ON public.call_logs
FOR UPDATE
USING (
    company_id IN (
        SELECT company_id FROM public.user_companies
        WHERE user_id = auth.uid()
    )
);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.call_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_call_logs_company_id ON public.call_logs(company_id);
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_status ON public.call_logs(status);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at);

-- Insert sample data (this will be removed in production)
INSERT INTO public.call_logs (
    company_id,
    lead_id,
    call_sid,
    status,
    duration,
    sentiment_score,
    notes,
    metadata
)
SELECT 
    c.id as company_id,
    l.id as lead_id,
    'CA' || gen_random_uuid()::text as call_sid,
    CASE floor(random() * 4)::int
        WHEN 0 THEN 'pending'
        WHEN 1 THEN 'in_progress'
        WHEN 2 THEN 'completed'
        ELSE 'failed'
    END as status,
    floor(random() * 300)::int as duration,
    (random() * 2 - 1)::float as sentiment_score,
    'Sample call log entry' as notes,
    '{"key": "value"}'::jsonb as metadata
FROM 
    public.companies c
    CROSS JOIN public.leads l
WHERE 
    l.company_id = c.id
LIMIT 10; 
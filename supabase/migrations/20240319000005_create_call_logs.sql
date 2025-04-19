-- Create call logs table
CREATE TABLE public.call_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    call_sid TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    duration INTEGER,
    recording_url TEXT,
    script TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
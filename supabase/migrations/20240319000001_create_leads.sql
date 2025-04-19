-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    title TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'converted', 'lost')),
    score INTEGER DEFAULT 0,
    notes TEXT,
    additional_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policies for leads table
CREATE POLICY "Users can view leads from their companies"
    ON public.leads
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.company_id = leads.company_id
        )
    );

CREATE POLICY "Users can create leads for their companies"
    ON public.leads
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.company_id = leads.company_id
        )
    );

CREATE POLICY "Users can update leads from their companies"
    ON public.leads
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_companies
            WHERE user_companies.user_id = auth.uid()
            AND user_companies.company_id = leads.company_id
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
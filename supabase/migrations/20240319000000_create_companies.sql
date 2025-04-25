-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    size TEXT,
    website TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    additional_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_companies table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.user_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, company_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- Create policies for companies table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' AND policyname = 'Users can view their own companies'
    ) THEN
        CREATE POLICY "Users can view their own companies"
            ON public.companies
            FOR SELECT
            USING (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' AND policyname = 'Users can create their own companies'
    ) THEN
        CREATE POLICY "Users can create their own companies"
            ON public.companies
            FOR INSERT
            WITH CHECK (auth.uid() = owner_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' AND policyname = 'Users can update their own companies'
    ) THEN
        CREATE POLICY "Users can update their own companies"
            ON public.companies
            FOR UPDATE
            USING (auth.uid() = owner_id);
    END IF;

    -- Add development policy for local testing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' AND policyname = 'Allow dev mode access'
    ) THEN
        CREATE POLICY "Allow dev mode access"
            ON public.companies
            USING (current_setting('app.environment', true) = 'development');
    END IF;
END $$;

-- Create policies for user_companies table
CREATE POLICY "Users can view their company memberships"
    ON public.user_companies
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Company owners can view their company members"
    ON public.user_companies
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.companies
            WHERE companies.id = user_companies.company_id
            AND companies.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create their own company memberships"
    ON public.user_companies
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_companies_updated_at
    BEFORE UPDATE ON public.user_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
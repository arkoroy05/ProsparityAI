-- Add development policy
DO $$ 
BEGIN
    -- Add development policy for local testing if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'companies' AND policyname = 'Allow development company creation'
    ) THEN
        CREATE POLICY "Allow development company creation"
            ON public.companies
            FOR INSERT
            WITH CHECK (
                (current_setting('app.environment', true) = 'development') OR
                (auth.uid() = owner_id)
            );
    END IF;

    -- Also add a similar policy for company_settings
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'company_settings' AND policyname = 'Allow development settings creation'
    ) THEN
        CREATE POLICY "Allow development settings creation"
            ON public.company_settings
            FOR INSERT
            WITH CHECK (
                (current_setting('app.environment', true) = 'development') OR
                EXISTS (
                    SELECT 1 FROM public.companies
                    WHERE companies.id = company_settings.company_id
                    AND companies.owner_id = auth.uid()
                )
            );
    END IF;
END $$; 
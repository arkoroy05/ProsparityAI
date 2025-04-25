-- Add contact information fields to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Comment on columns
COMMENT ON COLUMN public.companies.contact_email IS 'Primary contact email for the company';
COMMENT ON COLUMN public.companies.contact_phone IS 'Primary contact phone number for the company';
COMMENT ON COLUMN public.companies.description IS 'Company description or summary'; 
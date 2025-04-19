-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    call_sid TEXT,
    status TEXT CHECK (status IN ('scheduled', 'in-progress', 'completed', 'failed', 'cancelled')),
    duration INTEGER,
    recording_url TEXT,
    sentiment_score FLOAT,
    lead_response TEXT,
    notes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_transcripts table
CREATE TABLE IF NOT EXISTS call_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID REFERENCES call_logs(id) ON DELETE CASCADE,
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scheduled_calls table
CREATE TABLE IF NOT EXISTS scheduled_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')) DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
    ai_instructions TEXT,
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    twilio_phone_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_company_id ON call_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_lead_id ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_company_id ON scheduled_calls(company_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_scheduled_at ON scheduled_calls(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_status ON scheduled_calls(status);

-- Add RLS policies
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Policies for call_logs
CREATE POLICY "Users can view their company's call logs"
    ON call_logs FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create call logs for their company"
    ON call_logs FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ));

-- Policies for call_transcripts
CREATE POLICY "Users can view their company's call transcripts"
    ON call_transcripts FOR SELECT
    USING (call_id IN (
        SELECT id FROM call_logs WHERE company_id IN (
            SELECT company_id FROM user_companies WHERE user_id = auth.uid()
        )
    ));

-- Policies for scheduled_calls
CREATE POLICY "Users can view their company's scheduled calls"
    ON scheduled_calls FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage scheduled calls for their company"
    ON scheduled_calls FOR ALL
    USING (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
    WITH CHECK (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ));

-- Policies for company_settings
CREATE POLICY "Users can view their company settings"
    ON company_settings FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can manage their company settings"
    ON company_settings FOR ALL
    USING (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ))
    WITH CHECK (company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    ));

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_call_logs_updated_at
    BEFORE UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_scheduled_calls_updated_at
    BEFORE UPDATE ON scheduled_calls
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at(); 
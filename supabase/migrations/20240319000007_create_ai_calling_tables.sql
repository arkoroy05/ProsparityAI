-- Create scheduled_calls table
CREATE TABLE IF NOT EXISTS scheduled_calls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('scheduled', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_insights table
CREATE TABLE IF NOT EXISTS call_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_sid TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    insights TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_analysis table
CREATE TABLE IF NOT EXISTS call_analysis (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    call_sid TEXT NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    analysis TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scheduled_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for scheduled_calls
CREATE POLICY "Users can view their company's scheduled calls"
    ON scheduled_calls FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create scheduled calls for their company"
    ON scheduled_calls FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their company's scheduled calls"
    ON scheduled_calls FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

-- Create policies for call_insights
CREATE POLICY "Users can view their company's call insights"
    ON call_insights FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create call insights for their company"
    ON call_insights FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

-- Create policies for call_analysis
CREATE POLICY "Users can view their company's call analysis"
    ON call_analysis FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create call analysis for their company"
    ON call_analysis FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
    ));

-- Create indexes
CREATE INDEX idx_scheduled_calls_company_id ON scheduled_calls(company_id);
CREATE INDEX idx_scheduled_calls_lead_id ON scheduled_calls(lead_id);
CREATE INDEX idx_scheduled_calls_scheduled_at ON scheduled_calls(scheduled_at);
CREATE INDEX idx_call_insights_call_sid ON call_insights(call_sid);
CREATE INDEX idx_call_analysis_call_sid ON call_analysis(call_sid);

-- Create trigger for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON scheduled_calls
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at(); 
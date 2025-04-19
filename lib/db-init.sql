-- profiles table stores user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- companies table stores company information
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  industry TEXT,
  products_services JSONB, -- JSON array of products/services
  additional_details JSONB,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  owner_id UUID REFERENCES profiles(id) NOT NULL
);

-- Enum for lead status
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'unqualified', 'contacted', 'converted', 'dead');

-- leads table stores lead information
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  designation TEXT,
  status lead_status DEFAULT 'new' NOT NULL,
  score INTEGER DEFAULT 0, -- Lead score from 0-100
  classification TEXT, -- Classification category
  notes TEXT,
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  created_by UUID REFERENCES profiles(id) NOT NULL
);

-- Enum for task types
CREATE TYPE task_type AS ENUM ('call', 'email', 'message', 'meeting', 'other');

-- Enum for task status
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'canceled');

-- tasks table stores task information
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type task_type DEFAULT 'call' NOT NULL,
  status task_status DEFAULT 'pending' NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  priority INTEGER DEFAULT 1, -- 1 (lowest) to 5 (highest)
  ai_instructions TEXT, -- Additional instructions for AI
  metadata JSONB, -- Additional metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  company_id UUID REFERENCES companies(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id)
);

-- call_logs table stores logs of calls made
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  call_sid TEXT, -- Twilio call SID
  recording_url TEXT,
  transcript TEXT,
  duration INTEGER, -- Duration in seconds
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  task_id UUID REFERENCES tasks(id),
  lead_id UUID REFERENCES leads(id) NOT NULL
);

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Create RLS policies for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create policies for companies
CREATE POLICY "Company owners can do anything" 
  ON companies FOR ALL 
  USING (auth.uid() = owner_id);

-- Create policies for leads
CREATE POLICY "Users can view leads for their companies" 
  ON leads FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = leads.company_id AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert leads for their companies" 
  ON leads FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = leads.company_id AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update leads for their companies" 
  ON leads FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = leads.company_id AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete leads for their companies" 
  ON leads FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = leads.company_id AND companies.owner_id = auth.uid()
  ));

-- Create policies for tasks
CREATE POLICY "Users can view tasks for their companies" 
  ON tasks FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = tasks.company_id AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert tasks for their companies" 
  ON tasks FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = tasks.company_id AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can update tasks for their companies" 
  ON tasks FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = tasks.company_id AND companies.owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete tasks for their companies" 
  ON tasks FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM companies 
    WHERE companies.id = tasks.company_id AND companies.owner_id = auth.uid()
  ));

-- Create policies for call_logs
CREATE POLICY "Users can view call logs for their leads" 
  ON call_logs FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM leads 
    JOIN companies ON companies.id = leads.company_id 
    WHERE leads.id = call_logs.lead_id AND companies.owner_id = auth.uid()
  )); 
-- Add designation column to leads table
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS designation TEXT; 
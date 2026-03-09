-- Add new subscription fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  polar_id TEXT, -- The checkout session or subscription ID from Polar
  amount INTEGER, -- Assuming we might want to track the amount paid
  plan TEXT NOT NULL, -- The plan they bought (PRO, ULTRA, etc.)
  status TEXT DEFAULT 'pending', -- e.g., 'succeeded', 'failed', 'pending'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: RLS (Row Level Security) should be enabled if users need to fetch their own payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments" 
  ON payments FOR SELECT 
  USING (auth.uid() = user_id);

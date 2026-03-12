-- Add subscription end date and cancellation flag to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

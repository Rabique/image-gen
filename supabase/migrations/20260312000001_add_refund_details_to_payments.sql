-- Add refund columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS refunded_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

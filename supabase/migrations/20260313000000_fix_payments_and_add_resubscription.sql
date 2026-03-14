-- Rename 'amount' to 'amount_total' to match the webhook code
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount') THEN
    ALTER TABLE public.payments RENAME COLUMN amount TO amount_total;
  END IF;
END $$;

-- Add resubscription fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS resubscribed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_billing_at TIMESTAMPTZ;

-- Comment for clarity:
-- 'resubscribed_at': The timestamp when a user who had canceled their subscription decided to resubscribe.
-- 'next_billing_at': The date when the user is scheduled to be billed next, or when a paused subscription resumes.

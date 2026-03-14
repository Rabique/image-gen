const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFields() {
  const sql = `
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
  `;

  console.log('Attempting to apply migration via RPC "exec_sql"...');
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.log('--------------------------------------------------');
    console.error('Migration Error:', error.message);
    console.log('--------------------------------------------------');
    console.log('The "exec_sql" RPC function might not be enabled in your Supabase project.');
    console.log('Please copy and run the following SQL in your Supabase Dashboard SQL Editor:');
    console.log('--------------------------------------------------');
    console.log(sql);
    console.log('--------------------------------------------------');
  } else {
    console.log('Successfully applied fields to "users" and "payments" tables!');
  }
}

applyFields();

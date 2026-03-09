const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const sql = `
    -- Add new subscription fields to users table
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE',
    ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
    ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0;

    -- Create payments table
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      polar_id TEXT,
      amount INTEGER,
      plan TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view their own payments" 
      ON payments FOR SELECT 
      USING (auth.uid() = user_id);
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('Could not find the function "exec_sql"')) {
      console.error("The exec_sql RPC function does not exist. Please manually link and push using the CLI, or create the tables in the Supabase Dashboard SQL Editor manually.");
      console.log(sql);
    } else {
      console.error('Error executing SQL:', error);
    }
  } else {
    console.log('Migration completed successfully', data);
  }
}

runMigration();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('--- Checking "users" table columns ---');
  const { data: usersColumns, error: usersError } = await supabase.rpc('get_table_columns', { table_name: 'users' });
  if (usersError) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: info, error: infoError } = await supabase.from('users').select('*').limit(1);
    if (infoError) console.error('Error fetching users:', infoError);
    else console.log('Users table accessible. Columns:', Object.keys(info[0] || {}));
  } else {
    console.log('Users columns:', usersColumns);
  }

  console.log('\n--- Checking "payments" table columns ---');
  const { data: paymentsInfo, error: paymentsError } = await supabase.from('payments').select('*').limit(1);
  if (paymentsError) console.error('Error fetching payments:', paymentsError);
  else console.log('Payments table accessible. Columns:', Object.keys(paymentsInfo[0] || {}));
}

checkSchema();

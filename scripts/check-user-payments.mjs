import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const polarToken = process.env.POLAR_ACCESS_TOKEN;
const isSandbox = process.env.POLAR_SANDBOX === 'true';

if (!supabaseUrl || !supabaseKey || !polarToken) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const polar = new Polar({
  accessToken: polarToken,
  server: isSandbox ? 'sandbox' : 'production',
});

const EMAILS_TO_CHECK = ['rabiquebcm@gmail.com', 'oddyseibcm@gmail.com'];

async function checkUser(email) {
  console.log(`\n========================================`);
  console.log(`Checking for user: ${email}`);
  console.log(`========================================`);

  console.log('Searching in Supabase...');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (userError) {
    console.error(`Error fetching user ${email}:`, userError);
    return;
  }

  let user = null;
  if (!users || users.length === 0) {
    console.log(`No user found in Supabase matching "${email}".`);
  } else {
    user = users[0];
    console.log(`Found user in Supabase (ID: ${user.id})`);
    console.log(`Polar Customer ID: ${user.polar_customer_id || 'Not set'}`);
    console.log(`Current Plan: ${user.plan || 'N/A'}`);
    console.log(`Credits: ${user.credits ?? 0}`);

    console.log('\n--- Supabase Payments ---');
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id);

    if (paymentError) {
      console.error('Error fetching payments:', paymentError);
    } else if (payments.length === 0) {
      console.log('No payments recorded in Supabase.');
    } else {
      payments.forEach(p => {
        console.log(`- ${p.created_at}: ${p.amount} ${p.currency || 'USD'} (${p.status}) - Plan: ${p.plan}`);
      });
    }
  }

  // Polar Check
  const customerIdToUse = user?.polar_customer_id;
  
  if (customerIdToUse) {
    console.log('\nSearching Polar by linked Customer ID...');
    await fetchPolarData(customerIdToUse);
  } else {
    console.log('\nSearching Polar by email...');
    try {
        const customers = await polar.customers.list({ email });
        if (customers.result && customers.result.items.length > 0) {
            const polarCustomer = customers.result.items[0];
            console.log(`Found Polar Customer: ${polarCustomer.email} (ID: ${polarCustomer.id})`);
            await fetchPolarData(polarCustomer.id);
        } else {
            console.log('No customer found in Polar with this email.');
        }
    } catch (e) {
        console.error('Error searching Polar by email:', e.message);
    }
  }
}

async function fetchPolarData(customerId) {
    try {
        console.log('--- Polar Subscriptions ---');
        const subscriptions = await polar.subscriptions.list({ customerId });
        if (subscriptions.result && subscriptions.result.items.length > 0) {
             console.log(`Found ${subscriptions.result.items.length} subscriptions.`);
             for (const sub of subscriptions.result.items) {
                 console.log(`- ${sub.createdAt}: ${sub.status} - ${sub.product.name}`);
             }
        } else {
            console.log('No subscriptions found.');
        }

        console.log('--- Polar Orders ---');
        const orders = await polar.orders.list({ customerId });
        if (orders.result && orders.result.items.length > 0) {
             console.log(`Found ${orders.result.items.length} orders.`);
             for (const order of orders.result.items) {
                 console.log(`- ${order.createdAt}: ${order.amount} ${order.currency} - ${order.product.name}`);
             }
        } else {
            console.log('No orders found.');
        }
    } catch (e) {
        console.error('Error fetching Polar data:', e.message);
    }
}

async function main() {
  for (const email of EMAILS_TO_CHECK) {
    await checkUser(email);
  }
}

main().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import { Polar } from '@polar-sh/sdk';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const polarToken = process.env.POLAR_ACCESS_TOKEN;
const isSandbox = process.env.POLAR_SANDBOX === 'true';

const PRO_PRODUCT_ID = process.env.POLAR_PRO_PRODUCT_ID || "8cef16df-490f-44a3-b07c-e31274a34998";
const ULTRA_PRODUCT_ID = process.env.POLAR_ULTRA_PRODUCT_ID || "697c5bcb-62a9-44a5-80c6-687fcbcd200c";

if (!supabaseUrl || !supabaseKey || !polarToken) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const polar = new Polar({
  accessToken: polarToken,
  server: isSandbox ? 'sandbox' : 'production',
});

const TARGET_EMAILS = ['oddyseibcm@gmail.com', 'rabiquebcm@gmail.com'];

async function syncUser(email) {
  console.log(`\n--- Syncing: ${email} ---`);
  
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);

  if (userError || !users || users.length === 0) {
    console.log(`User not found in Supabase: ${email}`);
    return;
  }

  const user = users[0];
  let polarCustomerId = user.polar_customer_id;

  if (!polarCustomerId) {
    console.log('No Polar Customer ID linked. Searching by email...');
    const customers = await polar.customers.list({ email });
    if (customers.result && customers.result.items.length > 0) {
      polarCustomerId = customers.result.items[0].id;
      console.log(`Found Polar Customer ID: ${polarCustomerId}`);
    } else {
      console.log('No customer found in Polar.');
      return;
    }
  }

  // Fetch Orders
  console.log('Fetching Polar Orders...');
  const ordersResult = await polar.orders.list({ customerId: polarCustomerId });
  const orders = ordersResult.result?.items || [];
  
  // Fetch Subscriptions
  console.log('Fetching Polar Subscriptions...');
  const subsResult = await polar.subscriptions.list({ customerId: polarCustomerId });
  const subs = subsResult.result?.items || [];

  let totalCreditsFromOrders = 0;
  for (const order of orders) {
      let orderPlan = 'FREE';
      if (order.productId === PRO_PRODUCT_ID) orderPlan = 'PRO';
      else if (order.productId === ULTRA_PRODUCT_ID) orderPlan = 'ULTRA';
      
      // Only add credits for non-refunded orders
      if (order.status === 'paid' || order.status === 'fulfilled') {
          if (orderPlan === 'PRO') totalCreditsFromOrders += 100;
          else if (orderPlan === 'ULTRA') totalCreditsFromOrders += 300; 
      }
  }

  let latestPlan = 'FREE';
  let latestStatus = 'inactive';
  let cancelAtPeriodEnd = false;
  let endsAt = null;

  // Determine current active plan from subscriptions
  const activeSub = subs.find(s => s.status === 'active' || s.status === 'trialing');
  if (activeSub) {
      latestStatus = activeSub.status;
      cancelAtPeriodEnd = activeSub.cancelAtPeriodEnd || false;
      endsAt = activeSub.endsAt || activeSub.currentPeriodEnd || null;
      if (activeSub.productId === PRO_PRODUCT_ID) latestPlan = 'PRO';
      else if (activeSub.productId === ULTRA_PRODUCT_ID) latestPlan = 'ULTRA';
  } else if (subs.length > 0) {
      const latestSub = subs[0];
      latestStatus = latestSub.status;
      cancelAtPeriodEnd = latestSub.cancelAtPeriodEnd || false;
      endsAt = latestSub.endsAt || latestSub.endedAt || null;
      
      // Check if the subscription itself is refunded/revoked
      if (latestSub.status === 'revoked' || latestSub.status === 'refunded') {
          latestPlan = 'FREE';
      } else {
          if (latestSub.productId === PRO_PRODUCT_ID) latestPlan = 'PRO';
          else if (latestSub.productId === ULTRA_PRODUCT_ID) latestPlan = 'ULTRA';
      }
  }

  console.log(`Calculated: Plan=${latestPlan}, Status=${latestStatus}, Cancel=${cancelAtPeriodEnd}, Credits=${totalCreditsFromOrders}`);

  // Update Supabase User
  const updateData = {
      plan: latestPlan,
      subscription_status: latestStatus,
      cancel_at_period_end: cancelAtPeriodEnd,
      ends_at: endsAt,
      credits: totalCreditsFromOrders, // For a full sync, we just overwrite
      polar_customer_id: polarCustomerId,
      updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating Supabase user:', updateError);
  } else {
    console.log('Successfully synced user state.');
  }

  // --- Payments Table Sync ---
  const { data: existingPayments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', user.id);

  const existingPaymentsMap = new Map(existingPayments?.map(p => [p.polar_id, p]) || []);
  const paymentsToInsert = [];

  for (const order of orders) {
    const existing = existingPaymentsMap.get(order.id);
    
    let orderPlan = 'FREE';
    if (order.productId === PRO_PRODUCT_ID) orderPlan = 'PRO';
    else if (order.productId === ULTRA_PRODUCT_ID) orderPlan = 'ULTRA';

    const orderStatus = order.refundedAmount > 0 ? 'refunded' : 'succeeded';

    if (!existing) {
      paymentsToInsert.push({
        user_id: user.id,
        polar_id: order.id,
        amount_total: order.totalAmount ?? order.total_amount ?? order.amount ?? 0,
        plan: orderPlan,
        status: orderStatus,
        refunded_amount: order.refundedAmount || 0,
        refunded_at: order.refundedAmount > 0 ? new Date().toISOString() : null,
        created_at: order.createdAt
      });
    } else if (order.refundedAmount > 0 && existing.status !== 'refunded') {
      // Update existing record if it's now refunded
      console.log(`Updating order ${order.id} to refunded status.`);
      await supabase
        .from('payments')
        .update({
          status: 'refunded',
          refunded_amount: order.refundedAmount,
          refunded_at: new Date().toISOString()
        })
        .eq('polar_id', order.id);
    }
  }

  if (paymentsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('payments').insert(paymentsToInsert);
    if (insertError) console.error('Error inserting payments:', insertError);
    else console.log(`Inserted ${paymentsToInsert.length} payments.`);
  }
}

async function main() {
  for (const email of TARGET_EMAILS) {
    await syncUser(email);
  }
}

main().catch(console.error);

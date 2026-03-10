import { validateEvent } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PRO_PRODUCT_ID = "8cef16df-490f-44a3-b07c-e31274a34998";
const ULTRA_PRODUCT_ID = "697c5bcb-62a9-44a5-80c6-687fcbcd200c";

export async function GET() {
  console.log("Webhook GET request received for health check");
  return NextResponse.json({ 
    status: "active", 
    message: "ViralAI Webhook endpoint is ready to receive Polar events",
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const webhookPayload = validateEvent(
      body,
      headers,
      process.env.POLAR_WEBHOOK_SECRET ?? ""
    );

    console.log("Webhook event received:", webhookPayload.type);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Handle Order Paid (Charging Credits & Logging Payment)
    if (webhookPayload.type === "order.paid") {
      const order = webhookPayload.data as any;
      const metadata = (order.metadata || {}) as Record<string, string>;
      const userId = metadata.userId;
      
      if (!userId) {
        console.error("No userId found in order metadata");
        return NextResponse.json({ error: "No userId found" }, { status: 400 });
      }

      // Determine the plan based on product ID at the root of the order
      let incomingPlan = "FREE";
      const productId = order.product_id;
      
      if (productId === PRO_PRODUCT_ID) incomingPlan = "PRO";
      else if (productId === ULTRA_PRODUCT_ID) incomingPlan = "ULTRA";

      console.log(`Detected product ID: ${productId}, Plan: ${incomingPlan}`);

      // Fetch current user to check for upgrade logic
      const { data: userProfile, error: fetchError } = await supabase
        .from("users")
        .select("plan, credits")
        .eq("id", userId)
        .single();

      if (fetchError) {
        console.error(`Error fetching user profile for ${userId}:`, fetchError);
      }

      let creditsToAdd = 0;
      if (incomingPlan === "PRO") {
        creditsToAdd = 100;
      } else if (incomingPlan === "ULTRA") {
        // Upgrade check: If user was PRO and is now paying for ULTRA
        if (userProfile?.plan === "PRO") {
          creditsToAdd = 200; // Requirement 3: 차액 200 추가 (Upgrade)
        } else {
          creditsToAdd = 300; // Normal renewal or first purchase
        }
      }

      console.log(`User ${userId} paid for ${incomingPlan}. Adding ${creditsToAdd} credits.`);

      // Update User credits, plan, and status
      const { error: userError } = await supabase
        .from("users")
        .update({
          plan: incomingPlan,
          subscription_status: "active",
          credits: (userProfile?.credits || 0) + creditsToAdd,
          polar_customer_id: order.customer_id,
        })
        .eq("id", userId);

      if (userError) console.error("Error updating user profile:", userError);

      // Log payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          polar_id: order.id,
          amount: order.amount,
          plan: incomingPlan,
          status: "succeeded",
        });

      if (paymentError) console.error("Error logging payment:", paymentError);
    }

    // 2. Handle Subscription Events (Status & Plan Sync)
    if (
      webhookPayload.type === "subscription.created" ||
      webhookPayload.type === "subscription.updated" ||
      webhookPayload.type === "subscription.active"
    ) {
      const sub = webhookPayload.data as any;
      const metadata = (sub.metadata || {}) as Record<string, string>;
      const userId = metadata.userId;

      if (userId) {
        let incomingPlan = "FREE";
        if (sub.product_id === PRO_PRODUCT_ID) incomingPlan = "PRO";
        else if (sub.product_id === ULTRA_PRODUCT_ID) incomingPlan = "ULTRA";

        // Fetch current user profile to check for upgrade
        const { data: userProfile } = await supabase
          .from("users")
          .select("plan, credits")
          .eq("id", userId)
          .single();

        let creditsToAdd = 0;
        
        // Upgrade Logic in subscription.updated:
        // If user was PRO and is now ULTRA, add 200 credits (Requirement 3 Upgrade)
        if (webhookPayload.type === "subscription.updated") {
          if (userProfile?.plan === "PRO" && incomingPlan === "ULTRA") {
            creditsToAdd = 200;
            console.log(`Upgrade detected for ${userId} from PRO to ULTRA via Portal. Adding 200 credits.`);
          }
        }

        console.log(`Syncing subscription for ${userId}: Plan ${incomingPlan}, Status ${sub.status}`);

        // Sync status, plan, and credits if any
        const { error: syncError } = await supabase
          .from("users")
          .update({
            plan: incomingPlan,
            subscription_status: sub.status === "active" ? "active" : "inactive",
            polar_customer_id: sub.customer_id,
            credits: (userProfile?.credits || 0) + creditsToAdd,
          })
          .eq("id", userId);
        
        if (syncError) console.error("Error syncing subscription:", syncError);
      }
    }

    // 3. Handle Customer State Changed (Comprehensive Sync)
    if (webhookPayload.type === "customer.state_changed") {
      const customer = webhookPayload.data as any;
      const activeSubscriptions = customer.active_subscriptions || [];
      
      // Find the best plan among active subscriptions
      let bestPlan = "FREE";
      let customerId = customer.id;
      let userIdFromMetadata = null;

      for (const sub of activeSubscriptions) {
        if (sub.status !== "active") continue;
        
        const metadata = (sub.metadata || {}) as Record<string, string>;
        if (metadata.userId) userIdFromMetadata = metadata.userId;

        if (sub.product_id === ULTRA_PRODUCT_ID) {
          bestPlan = "ULTRA";
          break; // Ultra is highest
        }
        if (sub.product_id === PRO_PRODUCT_ID) {
          bestPlan = "PRO";
        }
      }

      if (userIdFromMetadata) {
        console.log(`Syncing customer ${customerId} state. Best plan: ${bestPlan}`);
        await supabase
          .from("users")
          .update({
            plan: bestPlan,
            subscription_status: bestPlan !== "FREE" ? "active" : "inactive",
            polar_customer_id: customerId,
          })
          .eq("id", userIdFromMetadata);
      }
    }

    // 4. Handle Revoked/Canceled/Expired
    if (
      webhookPayload.type === "subscription.revoked" ||
      webhookPayload.type === "subscription.canceled"
    ) {
      const sub = webhookPayload.data as any;
      const metadata = (sub.metadata || {}) as Record<string, string>;
      const userId = metadata.userId;

      // Revoked means immediate loss of access
      if (userId && webhookPayload.type === "subscription.revoked") {
        console.log(`Subscription revoked for ${userId}. Setting plan to FREE.`);
        await supabase
          .from("users")
          .update({
            plan: "FREE",
            subscription_status: "inactive",
          })
          .eq("id", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook verification failed or runtime error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed" },
      { status: 400 }
    );
  }
}

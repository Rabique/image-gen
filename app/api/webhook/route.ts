import { validateEvent } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { polar } from "@/lib/polar";

export const dynamic = "force-dynamic";

const PRO_PRODUCT_ID = process.env.POLAR_PRO_PRODUCT_ID || "8cef16df-490f-44a3-b07c-e31274a34998";
const ULTRA_PRODUCT_ID = process.env.POLAR_ULTRA_PRODUCT_ID || "697c5bcb-62a9-44a5-80c6-687fcbcd200c";

export async function GET() {
  return NextResponse.json({ 
    status: "active", 
    message: "ViralAI Webhook endpoint is ready",
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

      // 1. Handle Order Paid (Requirement 1 & 3: Charging Credits & Logging Payment)
    if (webhookPayload.type === "order.paid") {
      const order = webhookPayload.data as any;
      // Handle both camelCase (SDK) and snake_case (API)
      const productId = order.productId || order.product_id;
      const customerId = order.customerId || order.customer_id;
      
      // sandbox/production 모두에서 금액을 안전하게 추출 (cents 단위 확인)
      const amount = order.amount ?? order.total_amount ?? order.net_amount ?? 0;

      const metadata = (order.metadata || {}) as Record<string, string>;
      // Look for userId or user_id in metadata
      const userId = metadata.userId || metadata.user_id;
      
      if (!userId) {
        console.error("No userId found in order metadata. Metadata:", metadata);
        return NextResponse.json({ error: "No userId found" }, { status: 400 });
      }

      let incomingPlan = "FREE";
      if (productId === PRO_PRODUCT_ID) incomingPlan = "PRO";
      else if (productId === ULTRA_PRODUCT_ID) incomingPlan = "ULTRA";

      console.log(`Processing order.paid for user ${userId}, productId: ${productId}, detected plan: ${incomingPlan}`);

      // Fetch current user to determine credit logic
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
        if (userProfile?.plan === "PRO") {
          creditsToAdd = 200;
        } else {
          creditsToAdd = 300;
        }
      }

      console.log(`Adding ${creditsToAdd} credits to user ${userId}. Current credits: ${userProfile?.credits || 0}`);

      // Update User - Using a safer approach that handles potential missing column
      const updateData: any = {
        plan: incomingPlan,
        subscription_status: "active",
        credits: (userProfile?.credits || 0) + creditsToAdd,
        updated_at: new Date().toISOString(),
      };

      // Add polar_customer_id only if it's supposed to exist
      if (customerId) {
        updateData.polar_customer_id = customerId;
      }

      const { error: userUpdateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);

      if (userUpdateError) {
        console.error(`CRITICAL: Failed to update user ${userId} in order.paid:`, userUpdateError);
        // If it's the missing column error, try updating without it
        if (userUpdateError.code === "42703") {
           console.log("Retrying update without polar_customer_id...");
           delete updateData.polar_customer_id;
           await supabase.from("users").update(updateData).eq("id", userId);
        }
      }

      // Log payment
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          polar_id: order.id,
          amount_total: amount,
          plan: incomingPlan,
          status: "succeeded",
        });

      if (paymentError) {
        console.error(`Error logging payment for user ${userId}:`, paymentError);
      }
    }

    // 2. Handle Subscription Events
    const subEvents = [
      "subscription.created", 
      "subscription.updated", 
      "subscription.active", 
      "subscription.revoked", 
      "subscription.canceled"
    ];

    if (subEvents.includes(webhookPayload.type)) {
      const sub = webhookPayload.data as any;
      const productId = sub.productId || sub.product_id;
      const customerId = sub.customerId || sub.customer_id;
      const metadata = (sub.metadata || {}) as Record<string, string>;
      const userId = metadata.userId || metadata.user_id;

      if (userId) {
        const isActive = sub.status === "active" || sub.status === "trialing";
        
        let targetPlan = "FREE";
        if (isActive) {
          if (productId === PRO_PRODUCT_ID) targetPlan = "PRO";
          else if (productId === ULTRA_PRODUCT_ID) targetPlan = "ULTRA";
        }

        console.log(`Subscription Event (${webhookPayload.type}) for ${userId}: status=${sub.status}, productId=${productId}, targetPlan=${targetPlan}`);

        // Fetch current user for credit addition check (especially for upgrades)
        const { data: userProfile } = await supabase
          .from("users")
          .select("plan, credits")
          .eq("id", userId)
          .single();

        let creditsToAdd = 0;
        
        // Handle Upgrade Logic within subscription.updated
        if (webhookPayload.type === "subscription.updated" && isActive) {
          const oldPlan = userProfile?.plan || "FREE";
          
          if (oldPlan === "FREE" && targetPlan === "PRO") creditsToAdd = 100;
          else if (oldPlan === "FREE" && targetPlan === "ULTRA") creditsToAdd = 300;
          else if (oldPlan === "PRO" && targetPlan === "ULTRA") {
            creditsToAdd = 200; // Upgrade difference (300 - 100)
            console.log(`Detected upgrade from PRO to ULTRA for user ${userId}. Adding ${creditsToAdd} credits.`);
          }
        }

        if (!isActive && (webhookPayload.type === "subscription.created" || webhookPayload.type === "subscription.updated")) {
          console.log(`Subscription is ${sub.status}, skipping potential downgrade.`);
        } else {
          const subUpdateData: any = {
            plan: targetPlan,
            subscription_status: sub.status,
            cancel_at_period_end: sub.cancel_at_period_end || sub.cancel_at_period_end === true,
            ends_at: sub.ends_at || sub.current_period_end || null,
            updated_at: new Date().toISOString(),
          };

          if (creditsToAdd > 0) {
            subUpdateData.credits = (userProfile?.credits || 0) + creditsToAdd;
          }

          if (customerId) {
            subUpdateData.polar_customer_id = customerId;
          }

          const { error: subUpdateError } = await supabase
            .from("users")
            .update(subUpdateData)
            .eq("id", userId);

          if (subUpdateError) {
            console.error(`Error updating user ${userId} for subscription event:`, subUpdateError);
            if (subUpdateError.code === "42703") {
              console.log("Retrying subscription update without polar_customer_id...");
              delete subUpdateData.polar_customer_id;
              await supabase.from("users").update(subUpdateData).eq("id", userId);
            }
          }
        }
      }
    }

    // 3. Handle Refund Events
    if (webhookPayload.type === "refund.created" || webhookPayload.type === "refund.updated") {
      const refund = webhookPayload.data as any;
      const orderId = refund.orderId || refund.order_id;
      const amount = refund.amount || 0;
      
      console.log(`Processing refund (${webhookPayload.type}) for order ${orderId}, amount: ${amount}`);

      // Find the corresponding payment record to get userId and plan
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .select("user_id, plan, amount_total")
        .eq("polar_id", orderId)
        .single();

      if (payment && !paymentError) {
        const userId = payment.user_id;
        const plan = payment.plan;

        // Deduct credits based on the plan being refunded
        let creditsToDeduct = 0;
        if (plan === "PRO") creditsToDeduct = 100;
        else if (plan === "ULTRA") creditsToDeduct = 300;

        console.log(`Refund detected. Deducting ${creditsToDeduct} credits from user ${userId}.`);

        // Fetch current credits
        const { data: profile } = await supabase
          .from("users")
          .select("credits")
          .eq("id", userId)
          .single();

        const currentCredits = profile?.credits || 0;
        const newCredits = Math.max(0, currentCredits - creditsToDeduct);

        // Update user profile
        await supabase
          .from("users")
          .update({
            plan: "FREE",
            subscription_status: "refunded",
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq("id", userId);

        // Update payment record with refund details
        await supabase
          .from("payments")
          .update({
            status: "refunded",
            refunded_amount: amount,
            refunded_at: new Date().toISOString()
          })
          .eq("polar_id", orderId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook failed" },
      { status: 400 }
    );
  }
}

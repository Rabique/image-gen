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
          user_email: userProfile?.email || null,
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
      
      console.log(`[DEBUG] Sub event data:`, JSON.stringify({
        type: webhookPayload.type,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        customerId,
        productId
      }, null, 2));

      const metadata = (sub.metadata || {}) as Record<string, string>;
      let userId = metadata.userId || metadata.user_id;

      // Fallback: If userId is missing in metadata, find user by polar_customer_id
      if (!userId && customerId) {
        console.log(`[DEBUG] No userId in metadata, searching by customerId: ${customerId}`);
        const { data: userByCustomerId, error: searchError } = await supabase
          .from("users")
          .select("id")
          .eq("polar_customer_id", customerId)
          .single();
        
        if (searchError) console.error(`[DEBUG] Error searching user:`, searchError);

        if (userByCustomerId) {
          userId = userByCustomerId.id;
          console.log(`[DEBUG] Found user ${userId} via customerId ${customerId}`);
        } else {
          console.log(`[DEBUG] No user found with customerId ${customerId}`);
        }
      }

      if (userId) {
        const isActive = sub.status === "active" || sub.status === "trialing";
        
        let targetPlan = "FREE";
        if (isActive) {
          if (productId === PRO_PRODUCT_ID) targetPlan = "PRO";
          else if (productId === ULTRA_PRODUCT_ID) targetPlan = "ULTRA";
        }

        console.log(`[DEBUG] Subscription processing: userId=${userId}, isActive=${isActive}, targetPlan=${targetPlan}`);

        // Fetch current user for credit addition check (especially for upgrades)
        const { data: userProfile } = await supabase
          .from("users")
          .select("plan, credits, subscription_status")
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
            console.log(`[DEBUG] Upgrade detected. Credits to add: ${creditsToAdd}`);
          }
        }

        if (!isActive && (webhookPayload.type === "subscription.created" || webhookPayload.type === "subscription.updated")) {
          console.log(`[DEBUG] Subscription is ${sub.status}, skipping update to prevent accidental downgrade.`);
        } else {
          // Handle both camelCase and snake_case for all fields
          const isCanceled = sub.cancel_at_period_end === true || sub.cancelAtPeriodEnd === true || sub.cancel_at_period_end === "true";
          const endsAt = sub.ends_at ?? sub.endsAt;
          const currentPeriodEnd = sub.current_period_end ?? sub.currentPeriodEnd;

          // Check if this is a resubscription (was canceled, now active/renewed)
          const isResubscribing = userProfile?.subscription_status === "canceled" && isActive;
          // Check if this is an uncancel (was set to cancel, now rescinded)
          const isUncanceling = userProfile?.cancel_at_period_end === true && !isCanceled;

          // 취소된 경우: ends_at은 구독 종료일, 차기 결제일은 없음(null)
          // 활성 상태인 경우: ends_at은 null(계속됨), 차기 결제일은 currentPeriodEnd
          const subUpdateData: any = {
            plan: targetPlan,
            subscription_status: sub.status,
            cancel_at_period_end: isCanceled,
            ends_at: isCanceled ? (endsAt || currentPeriodEnd || null) : null,
            next_billing_at: isCanceled ? null : (currentPeriodEnd || endsAt || null),
            updated_at: new Date().toISOString(),
          };

          console.log(`[DEBUG] Available keys in sub object:`, Object.keys(sub));
          console.log(`[DEBUG] Mapped fields: isCanceled=${isCanceled}, endsAt=${endsAt}, currentPeriodEnd=${currentPeriodEnd}`);
          console.log(`[DEBUG] Final subUpdateData sent to Supabase:`, JSON.stringify(subUpdateData, null, 2));

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
            console.error(`[DEBUG] CRITICAL: Supabase update error:`, subUpdateError);
            if (subUpdateError.code === "42703") {
              console.log("[DEBUG] Retrying without polar_customer_id...");
              delete subUpdateData.polar_customer_id;
              await supabase.from("users").update(subUpdateData).eq("id", userId);
            }
          } else {
            console.log(`[DEBUG] Successfully updated user ${userId} subscription status.`);
          }
        }
      } else {
        console.log(`[DEBUG] No userId identified for this subscription event.`);
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

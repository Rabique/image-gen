import { validateEvent } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // 1. Handle Order Paid (Charging Credits & Logging Payment)
    if (webhookPayload.type === "order.paid") {
      const order = webhookPayload.data as any;
      const metadata = (order.metadata || {}) as Record<string, string>;
      const userId = metadata.userId;
      
      if (!userId) {
        console.error("No userId found in order metadata");
        return NextResponse.json({ error: "No userId found" }, { status: 400 });
      }

      let incomingPlan = "FREE";
      if (order.product_id === PRO_PRODUCT_ID) incomingPlan = "PRO";
      else if (order.product_id === ULTRA_PRODUCT_ID) incomingPlan = "ULTRA";

      // Fetch current user to determine credit logic
      const { data: userProfile } = await supabase
        .from("users")
        .select("plan, credits")
        .eq("id", userId)
        .single();

      let creditsToAdd = 0;
      if (incomingPlan === "PRO") {
        creditsToAdd = 100;
      } else if (incomingPlan === "ULTRA") {
        // Rule 3: Upgrade difference (Pro to Ultra)
        if (userProfile?.plan === "PRO") {
          creditsToAdd = 200;
        } else {
          creditsToAdd = 300;
        }
      }

      console.log(`Order Paid: User ${userId} paid for ${incomingPlan}. Adding ${creditsToAdd} credits.`);

      // Update User
      await supabase
        .from("users")
        .update({
          plan: incomingPlan,
          subscription_status: "active",
          credits: (userProfile?.credits || 0) + creditsToAdd,
          polar_customer_id: order.customer_id,
        })
        .eq("id", userId);

      // Log payment (Rule 1)
      await supabase
        .from("payments")
        .insert({
          user_id: userId,
          polar_id: order.id,
          amount: order.amount,
          plan: incomingPlan,
          status: "succeeded",
        });
    }

    // 2. Handle Subscription Events (Rule 2: Status & Plan Sync)
    const subEvents = [
      "subscription.created", 
      "subscription.updated", 
      "subscription.active", 
      "subscription.revoked", 
      "subscription.canceled"
    ];

    if (subEvents.includes(webhookPayload.type)) {
      const sub = webhookPayload.data as any;
      const metadata = (sub.metadata || {}) as Record<string, string>;
      const userId = metadata.userId;

      if (userId) {
        let incomingPlan = "FREE";
        // Only set plan to PRO/ULTRA if subscription is active or trialing
        if (sub.status === "active" || sub.status === "trialing") {
          if (sub.product_id === PRO_PRODUCT_ID) incomingPlan = "PRO";
          else if (sub.product_id === ULTRA_PRODUCT_ID) incomingPlan = "ULTRA";
        }

        console.log(`Subscription Event (${webhookPayload.type}): User ${userId} plan set to ${incomingPlan} (status: ${sub.status}, customerId: ${sub.customer_id})`);

        await supabase
          .from("users")
          .update({
            plan: incomingPlan,
            subscription_status: sub.status,
            polar_customer_id: sub.customer_id, // Ensure this is always updated
          })
          .eq("id", userId);
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

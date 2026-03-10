import { validateEvent } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

      // Fetch current user to check for upgrade logic
      const { data: userProfile } = await supabase
        .from("users")
        .select("plan, credits")
        .eq("id", userId)
        .single();

      let creditsToAdd = 0;
      if (incomingPlan === "PRO") {
        creditsToAdd = 100;
      } else if (incomingPlan === "ULTRA") {
        // Upgrade check: If user was PRO and is now paying for ULTRA
        if (userProfile?.plan === "PRO") {
          creditsToAdd = 200; // Requirement 3: Upgrade difference
        } else {
          creditsToAdd = 300; // First time or renewal
        }
      }

      console.log(`User ${userId} paid for ${incomingPlan}. Adding ${creditsToAdd} credits.`);

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

      // Log payment
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

    // 2. Handle Subscription Events (Status & Plan Sync)
    const subEvents = ["subscription.created", "subscription.updated", "subscription.active", "subscription.revoked", "subscription.canceled"];
    if (subEvents.includes(webhookPayload.type)) {
      const sub = webhookPayload.data as any;
      const metadata = (sub.metadata || {}) as Record<string, string>;
      const userId = metadata.userId;

      if (userId) {
        let incomingPlan = "FREE";
        if (sub.status === "active" || sub.status === "trialing") {
          if (sub.product_id === PRO_PRODUCT_ID) incomingPlan = "PRO";
          else if (sub.product_id === ULTRA_PRODUCT_ID) incomingPlan = "ULTRA";
        }

        const { data: userProfile } = await supabase
          .from("users")
          .select("plan, credits")
          .eq("id", userId)
          .single();

        let creditsToAdd = 0;
        // Upgrade Logic in subscription.updated:
        if (webhookPayload.type === "subscription.updated") {
          if (userProfile?.plan === "PRO" && incomingPlan === "ULTRA") {
            creditsToAdd = 200;
            console.log(`Upgrade detected for ${userId} from PRO to ULTRA. Adding 200 credits.`);
          }
        }

        await supabase
          .from("users")
          .update({
            plan: incomingPlan,
            subscription_status: sub.status,
            polar_customer_id: sub.customer_id,
            credits: (userProfile?.credits || 0) + creditsToAdd,
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

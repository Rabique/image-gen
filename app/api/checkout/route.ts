import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { planName } = body;

    // Get the user's Polar customer ID and current plan from the database
    const { data: userProfile } = await supabase
      .from("users")
      .select("polar_customer_id, plan, email")
      .eq("id", user.id)
      .single();

    let productId;
    if (planName === "PRO") {
      productId = process.env.POLAR_PRO_PRODUCT_ID;
    } else if (planName === "ULTRA") {
      productId = process.env.POLAR_ULTRA_PRODUCT_ID;
    }

    if (!productId) {
      return NextResponse.json({ error: "Invalid plan or missing product ID" }, { status: 400 });
    }

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
      server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
    });

    let customerId = userProfile?.polar_customer_id;

    // Search for existing customer in Polar if not in our DB
    if (!customerId) {
      try {
        const customers = await polar.customers.list({
          email: user.email || userProfile?.email || "",
        });
        if (customers.result.items && customers.result.items.length > 0) {
          customerId = (customers.result.items[0] as any).id;
          console.log(`Found existing Polar customer during checkout: ${customerId}`);
          // Update the DB for next time
          await supabase.from("users").update({ polar_customer_id: customerId }).eq("id", user.id);
        }
      } catch (e) {
        console.error("Error searching for customer during checkout:", e);
      }
    }

    const url = new URL(req.url);
    const origin = url.origin;

    try {
      const checkout = await polar.checkouts.create({
        products: [productId],
        customerEmail: user.email,
        // If we have a customerId, pass it to avoid duplicate customers
        customerId: customerId || undefined,
        metadata: {
          userId: user.id,
          planName: planName,
        },
        successUrl: `${origin}/dashboard?checkout_success=true`,
      });

      return NextResponse.json({ url: checkout.url });
    } catch (error: any) {
      // Handle the case where the user already has an active subscription
      if (error.name === "AlreadyActiveSubscriptionError" || error.message?.includes("AlreadyActiveSubscriptionError")) {
        console.log("User already has an active subscription. Redirecting to portal strategy.");
        
        return NextResponse.json({ 
          error: "ALREADY_SUBSCRIBED", 
          message: "You already have an active subscription. Please manage it through the billing portal." 
        }, { status: 409 });
      }
      throw error; // Re-throw other errors to be caught by the outer catch
    }
  } catch (error) {
    console.error("Error creating Polar checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

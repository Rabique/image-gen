import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's Polar customer ID from the database
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("polar_customer_id, plan, email")
      .eq("id", user.id)
      .single();

    const accessToken = process.env.POLAR_ACCESS_TOKEN;
    const isSandbox = process.env.POLAR_SANDBOX === "true";

    if (!accessToken) {
      console.error("POLAR_ACCESS_TOKEN is missing in environment variables");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    console.log(`Initializing Polar SDK (Sandbox: ${isSandbox}, Token Prefix: ${accessToken.substring(0, 10)}...)`);

    const polar = new Polar({
      accessToken: accessToken,
      server: isSandbox ? "sandbox" : "production",
    });

    let customerId = userProfile?.polar_customer_id;

    // If ID is missing, try to find it by email in Polar
    if (!customerId) {
      console.log(`Searching for Polar customer by email: ${user.email}`);
      try {
        const customers = await polar.customers.list({
          email: user.email || userProfile?.email || "",
        });
        
        if (customers.result && customers.result.items && customers.result.items.length > 0) {
          customerId = customers.result.items[0].id;
          console.log(`Found Polar customer ID: ${customerId}`);
          
          // Update the database for next time
          const updateData: any = { polar_customer_id: customerId };
          const { error: updateError } = await supabase
            .from("users")
            .update(updateData)
            .eq("id", user.id);
            
          if (updateError && updateError.code === "42703") {
            console.log("Could not update polar_customer_id in DB (column missing), but proceeding with portal session.");
          }
        }
      } catch (searchError) {
        console.error("Error searching for Polar customer:", searchError);
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No active Polar customer found. Please subscribe first." },
        { status: 404 }
      );
    }

    const { origin } = new URL(request.url);

    // Create a customer portal session using the standard SDK approach
    try {
      // Use customerSessions.create from the SDK
      const session = await polar.customerSessions.create({
        customerId: customerId,
        returnUrl: `${origin}/dashboard`,
      });

      if (!session || !session.customerPortalUrl) {
        throw new Error("Portal session or URL missing from response");
      }

      return NextResponse.json({ url: session.customerPortalUrl });
    } catch (sdkError) {
      console.error("Polar SDK Error creating session:", sdkError);
      return NextResponse.json({ error: "Failed to create Polar session" }, { status: 500 });
    }
  } catch (error) {
    console.error("Critical Error in portal route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

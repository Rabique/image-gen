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

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
      server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
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

    // Create a customer portal session with return_url
    // Try both common paths for this SDK version
    const createSession = polar.customerSessions?.create || (polar as any).customerPortal?.sessions?.create;

    if (!createSession) {
      console.error("Could not find customer session creation method in Polar SDK. Available keys:", Object.keys(polar));
      return NextResponse.json({ error: "Internal SDK error" }, { status: 500 });
    }

    const session = await createSession.call(polar.customerSessions || (polar as any).customerPortal.sessions, {
      customerId: customerId,
      returnUrl: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error("Error creating Polar customer portal session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

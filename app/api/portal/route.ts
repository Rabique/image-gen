import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's Polar customer ID from the database
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("polar_customer_id, plan")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile?.polar_customer_id) {
      console.error("User profile or Polar Customer ID not found for user:", user.id);
      console.log("Profile Data:", userProfile);
      console.log("Profile Error:", profileError);
      return NextResponse.json(
        { error: `Customer ID not found for user ${user.id}. Current plan: ${userProfile?.plan || 'unknown'}` },
        { status: 404 }
      );
    }

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
      server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
    });

    // Create a customer portal session
    const session = await polar.customerSessions.create({
      customerId: userProfile.polar_customer_id,
    });

    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error("Error creating Polar customer portal session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

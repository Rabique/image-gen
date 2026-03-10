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

    const url = new URL(req.url);
    const origin = url.origin;

    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email,
      metadata: {
        userId: user.id,
        planName: planName,
      },
      successUrl: `${origin}/dashboard?checkout_success=true`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Error creating Polar checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

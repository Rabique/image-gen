import { Polar } from "@polar-sh/sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
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

    console.log("Product ID selected:", productId);

    const polar = new Polar({
      accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
      server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
    });

    console.log("Calling polar checkout create with product ID:", productId);
    const checkout = await polar.checkouts.create({
      products: [productId]
    });
    console.log("Checkout created URL:", checkout.url);

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Error creating Polar checkout:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

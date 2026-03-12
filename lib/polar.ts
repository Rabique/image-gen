import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
});

/**
 * Creates a custom benefit in Polar.
 * Useful for credits, license keys, or any custom feature access.
 */
export async function createCustomBenefit({
  description,
  organizationId,
  credits,
}: {
  description: string;
  organizationId: string;
  credits: number;
}) {
  return await polar.benefits.create({
    type: "custom",
    description,
    organizationId,
    properties: {
      note: `${credits} Credits for Image Generation`,
      // We can also store the numeric value in metadata for easier parsing in webhooks
    },
    metadata: {
      credits: credits,
    },
  });
}

/**
 * Attaches a benefit to a product.
 * NOTE: This replaces existing benefits. To append, fetch current benefits first.
 */
export async function attachBenefitToProduct(productId: string, benefitId: string) {
  // First, get current product to see existing benefits
  const product = await polar.products.get(productId);
  const existingBenefits = product.benefits?.map((b: any) => b.id) || [];
  
  if (existingBenefits.includes(benefitId)) {
    console.log(`Benefit ${benefitId} already attached to product ${productId}`);
    return product;
  }

  return await polar.products.updateBenefits(productId, {
    benefits: [...existingBenefits, benefitId],
  });
}

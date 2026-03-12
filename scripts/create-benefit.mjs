/**
 * Script to create a Polar benefit for "Credits" and attach it to products.
 * Usage: POLAR_ACCESS_TOKEN=xxx POLAR_PRO_PRODUCT_ID=xxx POLAR_ULTRA_PRODUCT_ID=xxx node scripts/create-benefit.mjs
 */

import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
});

async function main() {
  if (!process.env.POLAR_ACCESS_TOKEN) {
    console.error("Missing POLAR_ACCESS_TOKEN environment variable.");
    process.exit(1);
  }

  // 1. Fetch organization
  console.log("Fetching organizations...");
  const orgsResult = await polar.organizations.list({});
  
  let organization;
  // Polar SDK result is an async iterator
  for await (const org of orgsResult) {
    organization = org;
    break; 
  }

  if (!organization) {
    console.error("No organization found on this account.");
    process.exit(1);
  }

  console.log(`Using organization: ${organization.name} (${organization.id})`);

  // 2. Create the "Custom Benefit" for 100 Credits
  console.log("Creating 100 Credits Benefit...");
  const benefit100 = await polar.benefits.create({
    type: "custom",
    description: "100 Image Generation Credits",
    organizationId: organization.id,
    properties: {
      note: "100 credits have been added to your account for image generation.",
    },
    metadata: {
        credits: 100
    }
  });
  console.log(`Benefit created: ${benefit100.id}`);

  // 3. Create the "Custom Benefit" for 300 Credits
  console.log("Creating 300 Credits Benefit...");
  const benefit300 = await polar.benefits.create({
    type: "custom",
    description: "300 Image Generation Credits",
    organizationId: organization.id,
    properties: {
      note: "300 credits have been added to your account for image generation.",
    },
    metadata: {
        credits: 300
    }
  });
  console.log(`Benefit created: ${benefit300.id}`);

  // 4. Attach to PRO product
  const proId = process.env.POLAR_PRO_PRODUCT_ID || "8cef16df-490f-44a3-b07c-e31274a34998";
  if (proId) {
    console.log(`Attaching 100 Credits benefit to PRO product: ${proId}`);
    try {
        const product = await polar.products.get({ id: proId });
        const existingBenefits = product.benefits?.map(b => b.id) || [];
        
        if (!existingBenefits.includes(benefit100.id)) {
            await polar.products.updateBenefits({ 
                id: proId,
                updateProductBenefits: {
                    benefits: [...existingBenefits, benefit100.id]
                }
            });
            console.log("Successfully attached to PRO product.");
        } else {
            console.log("Benefit already attached to PRO product.");
        }
    } catch (e) {
        console.warn(`Could not attach to PRO product: ${e.message}`);
        console.dir(e, { depth: null });
    }
  }

  // 5. Attach to ULTRA product
  const ultraId = process.env.POLAR_ULTRA_PRODUCT_ID || "697c5bcb-62a9-44a5-80c6-687fcbcd200c";
  if (ultraId) {
    console.log(`Attaching 300 Credits benefit to ULTRA product: ${ultraId}`);
    try {
        const product = await polar.products.get({ id: ultraId });
        const existingBenefits = product.benefits?.map(b => b.id) || [];
        
        if (!existingBenefits.includes(benefit300.id)) {
            await polar.products.updateBenefits({ 
                id: ultraId,
                updateProductBenefits: {
                    benefits: [...existingBenefits, benefit300.id]
                }
            });
            console.log("Successfully attached to ULTRA product.");
        } else {
            console.log("Benefit already attached to ULTRA product.");
        }
    } catch (e) {
        console.warn(`Could not attach to ULTRA product: ${e.message}`);
    }
  }

  console.log("Done!");
}

main().catch(console.error);

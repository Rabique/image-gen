const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const IS_SANDBOX = process.env.POLAR_SANDBOX === "true";
const BASE_URL = IS_SANDBOX ? "https://sandbox-api.polar.sh/v1" : "https://api.polar.sh/v1";

const PRO_PRODUCT_ID = "8cef16df-490f-44a3-b07c-e31274a34998";
const ULTRA_PRODUCT_ID = "697c5bcb-62a9-44a5-80c6-687fcbcd200c";

const BENEFIT_100_ID = "ff5372f8-55c1-453c-952e-b19067fa96bf";
const BENEFIT_300_ID = "c1cba0fa-2b23-41e9-a826-dd47c6bb43f1";

async function attach(productId, benefitId) {
  console.log(`Attaching ${benefitId} to ${productId}...`);
  
  // 1. Get current benefits
  const getRes = await fetch(`${BASE_URL}/products/${productId}`, {
    headers: { "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}` }
  });
  const product = await getRes.json();
  const existingBenefits = product.benefits?.map(b => b.id) || [];
  
  if (existingBenefits.includes(benefitId)) {
    console.log("Already attached.");
    return;
  }

  // 2. Update benefits
  const postRes = await fetch(`${BASE_URL}/products/${productId}/benefits`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${POLAR_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      benefits: [...existingBenefits, benefitId]
    })
  });

  if (postRes.ok) {
    console.log("Successfully attached!");
  } else {
    const error = await postRes.text();
    console.error(`Failed: ${postRes.status} ${error}`);
  }
}

async function main() {
  await attach(PRO_PRODUCT_ID, BENEFIT_100_ID);
  await attach(ULTRA_PRODUCT_ID, BENEFIT_300_ID);
}

main().catch(console.error);

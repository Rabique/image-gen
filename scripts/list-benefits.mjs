import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  server: process.env.POLAR_SANDBOX === "true" ? "sandbox" : "production",
});

async function main() {
  const orgs = await polar.organizations.list({});
  const org = orgs.result.items[0];
  console.log(`Org: ${org.name} (${org.id})`);

  const benefitsResult = await polar.benefits.list({ organizationId: org.id });
  console.log(`Found ${benefitsResult.result.pagination.totalCount} benefits.`);
  
  for (const b of benefitsResult.result.items) {
    console.log(`${b.id} | ${b.type} | ${b.description}`);
  }
}

main().catch(console.error);

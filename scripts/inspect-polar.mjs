import { Polar } from "@polar-sh/sdk";

const polar = new Polar({
  accessToken: "test",
});

console.log("Polar keys:", Object.keys(polar));
if (polar.customerSessions) console.log("customerSessions keys:", Object.keys(polar.customerSessions));
if (polar.customerPortal) {
    console.log("customerPortal keys:", Object.keys(polar.customerPortal));
    if (polar.customerPortal.sessions) console.log("customerPortal.sessions keys:", Object.keys(polar.customerPortal.sessions));
}

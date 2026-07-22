import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const {
  generateVolunteerChatReply,
  classifyMessage,
  getLlmProviderStatus,
} = await import("../src/lib/xai.ts");

console.log("provider", getLlmProviderStatus());
console.log(
  "classify",
  await classifyMessage("Where are the food stalls near gate 2?", [
    "FOOD",
    "RESTROOM",
  ])
);

const a1 = await generateVolunteerChatReply({
  stadiumId: "metlife",
  language: "en",
  query: "Where are the food stalls near gate 2?",
  protocolTitle: "FOOD",
  protocolBody: "Food on 100-level concourse near gates 1-3.",
  mode: "faq",
});
console.log("faq1:", (a1 || "(null)").slice(0, 280));

const a2 = await generateVolunteerChatReply({
  stadiumId: "metlife",
  language: "en",
  query: "Where is the prayer room?",
  protocolTitle: "PRAYER",
  protocolBody: "Multifaith prayer room near Guest Services Gate 5.",
  mode: "faq",
});
console.log("faq2:", (a2 || "(null)").slice(0, 280));

const a3 = await generateVolunteerChatReply({
  stadiumId: "metlife",
  language: "en",
  query: "Spill of soda on concourse 110 near elevator",
  mode: "incident_ack",
});
console.log("incident:", (a3 || "(null)").slice(0, 280));

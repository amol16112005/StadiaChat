import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const {
  generateOpsIncidentBriefing,
  generateLeadResolutionDirective,
  generateOpsTaskBriefing,
  generateRemediationOptions,
  generateEmergencyProtocolDeploy,
  getLlmProviderStatus,
} = await import("../src/lib/xai.ts");

console.log("provider", getLlmProviderStatus());

const opts = await generateRemediationOptions(
  "Soda spill blocking ADA path near Gate 3 elevator",
  "normal",
  { stadiumId: "metlife", reporterName: "Alex", hasPhoto: true }
);
console.log("\nremediation:", opts);

const brief = await generateOpsIncidentBriefing({
  stadiumId: "metlife",
  opsLanguage: "en",
  reporterName: "Alex",
  incidentText: "Soda spill blocking ADA path near Gate 3 elevator",
  severity: "normal",
  hasPhoto: true,
  remediationOptions: opts,
});
console.log("\nops brief:", (brief || "(null)").slice(0, 400));

const serious = await generateOpsIncidentBriefing({
  stadiumId: "metlife",
  opsLanguage: "en",
  reporterName: "Sam",
  incidentText: "Unattended bag under seat Section 112 Row F",
  severity: "serious",
  hasPhoto: false,
  remediationOptions: [
    "Cordon Section 112",
    "Call bomb tech channel 1",
    "Hold adjacent rows",
  ],
});
console.log("\nserious ops brief:", (serious || "(null)").slice(0, 400));

const task = await generateOpsTaskBriefing({
  stadiumId: "metlife",
  volunteerLanguage: "en",
  command: "Restock water bottles and paper cups at Guest Services Gate 5 before doors open",
  locationTag: "Guest Services",
  priority: "high",
});
console.log("\ntask card:", task);

const resolve = await generateLeadResolutionDirective({
  stadiumId: "metlife",
  volunteerLanguage: "en",
  leadLanguage: "en",
  incidentText: "Soda spill blocking ADA path near Gate 3 elevator",
  severity: "normal",
  leadOption: "Dispatch nearest volunteer with cleanup kit",
  leadName: "Ops Lead Jordan",
});
console.log("\nresolution:", (resolve || "(null)").slice(0, 400));

const em = await generateEmergencyProtocolDeploy({
  stadiumId: "metlife",
  volunteerLanguage: "en",
  opsLanguage: "en",
  reporterName: "Sam",
  incidentText: "Missing child last seen Gate 2 wearing red jersey",
  protocolTitle: "MISSING CHILD",
  protocolBody:
    "1. Radio Channel 1 immediately. 2. Obtain description. 3. Hold exits if directed. 4. Stay with reporting party.",
});
console.log("\nemergency volunteer:", (em.volunteerSteps || "(null)").slice(0, 300));
console.log("emergency ops:", (em.opsBrief || "(null)").slice(0, 300));

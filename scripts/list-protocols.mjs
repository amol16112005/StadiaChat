import fs from "fs";
const d = JSON.parse(fs.readFileSync("data/db.json", "utf8"));
const byCat = {};
for (const p of d.protocols) {
  byCat[p.category] = (byCat[p.category] || 0) + 1;
}
console.log("Protocol counts by type:", byCat);
console.log("\nAll protocols:");
for (const p of d.protocols) {
  console.log(`  [${p.category}] ${p.stadium_id}: ${p.title}`);
}
const stadiums = [...new Set(d.protocols.map((p) => p.stadium_id))];
console.log("\nCoverage by stadium:");
for (const s of stadiums) {
  const titles = d.protocols.filter((p) => p.stadium_id === s).map((p) => p.title);
  console.log(`  ${s} (${titles.length}): ${titles.join(" | ")}`);
}

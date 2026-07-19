import fs from "fs";
const p = "data/db.json";
if (!fs.existsSync(p)) {
  console.log("no db.json — seed not created yet");
  process.exit(0);
}
const d = JSON.parse(fs.readFileSync(p, "utf8"));
const vols = d.users.filter((u) => u.role === "Volunteer");
console.log(
  "Volunteers:\n",
  vols
    .map(
      (u) =>
        `  - ${u.name} | stadium=${u.stadium_id} | status=${u.status} | lang=${u.preferred_language}`
    )
    .join("\n")
);
const ram = vols.filter((u) => u.name.toLowerCase().includes("ram"));
console.log("\nMatches for 'ram':", ram.length ? ram : "NONE");
console.log(
  "\nStadium PINs:\n",
  d.stadiums.map((s) => `  ${s.id} → PIN ${s.pin}`).join("\n")
);

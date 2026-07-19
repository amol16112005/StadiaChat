import fs from "fs";
const p = "data/db.json";
const d = JSON.parse(fs.readFileSync(p, "utf8"));
const exists = d.users.find(
  (u) =>
    u.role === "Volunteer" &&
    u.name.toLowerCase() === "ram" &&
    u.stadium_id === "metlife_2026"
);
if (exists) {
  exists.status = "approved";
  console.log("Updated existing ram → approved");
} else {
  d.users.push({
    id: `vol_ram_${Date.now().toString(36)}`,
    name: "ram",
    preferred_language: "en",
    stadium_id: "metlife_2026",
    role: "Volunteer",
    status: "approved",
    created_at: new Date().toISOString(),
  });
  console.log("Created volunteer ram (approved) at metlife_2026");
}
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log("Login: name=ram, stadium=metlife_2026, PIN=WC26-MET");

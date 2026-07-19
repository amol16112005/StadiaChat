import fs from "fs";
const s = fs.readFileSync("src/lib/i18n.ts", "utf8");
const start = s.indexOf("const en: Dict = {");
const end = s.indexOf("\n};\n\nconst es:");
const block = s.slice(start, end);
const pairs = [];
const re = /"([^"]+)":\s*((?:"(?:\\.|[^"\\])*")|(?:\n\s*"(?:\\.|[^"\\])*")+)/g;
// simpler line-based
const lines = block.split("\n");
let key = null;
let buf = "";
for (const line of lines) {
  const km = line.match(/^\s*"([^"]+)":\s*(.*)$/);
  if (km) {
    if (key) pairs.push([key, buf.replace(/,$/, "").trim()]);
    key = km[1];
    buf = km[2];
    if (!buf.endsWith(",") && !buf.endsWith('"') && !buf.includes('"')) {
      // multi-line start
    }
  } else if (key) {
    buf += "\n" + line;
  }
}
if (key) pairs.push([key, buf.replace(/,$/, "").trim()]);
console.log("pairs", pairs.length);
const obj = {};
for (const [k, v] of pairs) {
  try {
    obj[k] = JSON.parse(v.replace(/,$/, ""));
  } catch {
    const m = v.match(/^"([\s\S]*)"$/);
    obj[k] = m ? m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"') : v;
  }
}
fs.writeFileSync("scripts/en-keys.json", JSON.stringify(obj, null, 2));
console.log("wrote", Object.keys(obj).length, "keys");

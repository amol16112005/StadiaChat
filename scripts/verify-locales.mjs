import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "src", "lib", "locales");
const langs = ["en", "es", "fr", "pt", "de", "ar", "ja", "ko", "zh", "it", "hi"];

const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf8"));
const enKeys = Object.keys(en);
console.log("en keys:", enKeys.length);

let ok = true;
const counts = {};
for (const l of langs) {
  const file = path.join(dir, `${l}.json`);
  if (!fs.existsSync(file)) {
    console.log(`${l}: FILE MISSING`);
    ok = false;
    continue;
  }
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  const keys = Object.keys(d);
  counts[l] = keys.length;
  const missing = enKeys.filter((k) => !(k in d));
  const extra = keys.filter((k) => !(k in en));
  console.log(
    `${l}: count=${keys.length} missing=${missing.length} extra=${extra.length}`
  );
  if (missing.length) {
    console.log("  missing:", missing);
    ok = false;
  }
  if (extra.length) {
    console.log("  extra:", extra);
    ok = false;
  }
}

for (const l of langs) {
  if (l === "en") continue;
  const d = JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), "utf8"));
  for (const k of enKeys) {
    const placeholders = [...String(en[k]).matchAll(/\{[a-zA-Z0-9_]+\}/g)].map(
      (m) => m[0]
    );
    for (const p of placeholders) {
      if (!String(d[k] ?? "").includes(p)) {
        console.log(`${l}: missing placeholder ${p} in key ${k}`);
        ok = false;
      }
    }
  }
}

console.log(ok ? "\nALL LOCALES OK" : "\nISSUES FOUND");
console.log("counts:", counts);
process.exit(ok ? 0 : 1);

const base = "http://localhost:3000";
const jar = new Map();

function storeCookies(res) {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size)
    headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(base + path, { ...opts, headers });
  storeCookies(res);
  return { status: res.status, json: await res.json() };
}

await req("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "volunteer",
    name: "Alex Rivera",
    stadium_id: "metlife_2026",
    stadium_pin: "WC26-MET",
    language: "en",
  }),
});

const tests = [
  "Where are the food stalls inside the stadium?",
  "Where can I get food on the concourse?",
  "Best restaurants near the stadium?",
  "Where is the merchandise shop?",
];

for (const text of tests) {
  const r = await req("/api/fan-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: text, preferred_language: "en" }),
  });
  console.log("\nQ:", text);
  console.log("status", r.status, "cat", r.json.category, "proto", r.json.protocol_title);
  console.log("A:", (r.json.answer || r.json.error || "").slice(0, 220));
}

const chat = await req("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "Where are food stalls inside the stadium?" }),
});
console.log("\nChat food:", chat.json.category, chat.json.volunteerMessages?.slice(-1)?.[0]?.text?.slice(0, 180));

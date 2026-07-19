const base = "http://localhost:3000";

async function main() {
  console.log("1) Storage health");
  const health = await fetch(`${base}/api/health/storage`).then((r) => r.json());
  console.log(JSON.stringify(health, null, 2));

  if (health.active_backend !== "mongodb" || !health.mongo_ready) {
    console.error("MongoDB is NOT active. Fix MONGODB_URI and restart npm run dev.");
    process.exit(1);
  }

  console.log("\n2) Volunteer login (Alex)");
  const jar = new Map();
  function store(res) {
    for (const c of res.headers.getSetCookie?.() || []) {
      const [p] = c.split(";");
      const i = p.indexOf("=");
      jar.set(p.slice(0, i), p.slice(i + 1));
    }
  }
  function cookie() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  let res = await fetch(`${base}/api/auth/login`, {
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
  store(res);
  const login = await res.json();
  console.log("login", res.status, login.user?.name, login.user?.status);

  console.log("\n3) Chat (writes app_state + memory_events)");
  res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookie(),
    },
    body: JSON.stringify({
      text: "Where are the food stalls inside the stadium?",
    }),
  });
  const chat = await res.json();
  console.log("chat", res.status, "cat", chat.category);

  console.log("\n4) Memory API");
  res = await fetch(`${base}/api/memory?limit=5`, {
    headers: { cookie: cookie() },
  });
  const mem = await res.json();
  console.log(
    "memory enabled=",
    mem.enabled,
    "count=",
    mem.count,
    "sample=",
    (mem.events || []).slice(-2).map((e) => `${e.kind}: ${e.text.slice(0, 60)}`)
  );

  console.log("\n✅ MongoDB memory layer is working.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

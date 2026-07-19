const base = "http://localhost:3000";
const jar = new Map();

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (jar.size) headers.cookie = cookieHeader();
  const res = await fetch(`${base}${path}`, { ...opts, headers });
  storeCookies(res);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 200);
  }
  return { status: res.status, json };
}

function pass(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  return ok;
}

async function main() {
  let failed = 0;

  const home = await fetch(base);
  if (!pass("Home page", home.status === 200, `HTTP ${home.status}`)) failed++;

  const stadiums = await req("/api/stadiums");
  const n = stadiums.json?.stadiums?.length || 0;
  if (!pass("Stadiums API", stadiums.status === 200 && n >= 6, `${n} venues`))
    failed++;

  const login = await req("/api/auth/login", {
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
  if (
    !pass(
      "Volunteer login",
      login.status === 200 && login.json?.user?.status === "approved",
      login.json?.error || login.json?.user?.name
    )
  )
    failed++;

  const catA = await req("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Where is the nearest ADA elevator to Gate 3?",
    }),
  });
  if (
    !pass(
      "Chat Cat A (FAQ)",
      catA.status === 200 && catA.json?.category === "A",
      catA.json?.category || catA.json?.error
    )
  )
    failed++;

  const catB = await req("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "What restaurants are best near the stadium?",
    }),
  });
  if (
    !pass(
      "Chat Cat B (out of scope)",
      catB.status === 200 && catB.json?.category === "B",
      catB.json?.category || catB.json?.error
    )
  )
    failed++;

  const fan = await req("/api/fan-assist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: "Where are the restrooms?",
      preferred_language: "en",
    }),
  });
  if (
    !pass(
      "Fan Assist",
      fan.status === 200 && Boolean(fan.json?.answer),
      fan.json?.answer?.slice(0, 60) || fan.json?.error
    )
  )
    failed++;

  // Register without PIN
  jar.clear();
  const reg = await req("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Test Vol ${Date.now()}`,
      language: "es",
      stadium_id: "sofi_2026",
    }),
  });
  if (
    !pass(
      "Register without PIN",
      reg.status === 200 && reg.json?.status === "pending",
      reg.json?.status || reg.json?.error
    )
  )
    failed++;

  // Profile
  jar.clear();
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
  const profile = await req("/api/profile");
  if (
    !pass(
      "Profile GET",
      profile.status === 200 && profile.json?.user?.name,
      profile.json?.user?.name || profile.json?.error
    )
  )
    failed++;

  // Ops login
  jar.clear();
  const ops = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "ops",
      stadium_id: "metlife_2026",
      credential: "ops_metlife_2026",
      language: "en",
    }),
  });
  if (
    !pass(
      "Ops Lead login",
      ops.status === 200 && ops.json?.panel === "master_terminal",
      ops.json?.panel || ops.json?.error
    )
  )
    failed++;

  // Env key presence (not the value)
  const fs = await import("fs");
  const env = fs.readFileSync(".env.local", "utf8");
  const keyLine = env
    .split(/\n/)
    .find((l) => l.startsWith("GOOGLE_AI_API_KEY="));
  const keyVal = keyLine ? keyLine.slice("GOOGLE_AI_API_KEY=".length).trim() : "";
  const hasKey = keyVal.length > 10;
  pass(
    "GOOGLE_AI_API_KEY in .env.local",
    hasKey,
    hasKey
      ? "set (Gen AI cascade will run)"
      : "EMPTY — heuristics only until you paste a key"
  );
  if (!hasKey) {
    console.log(
      "\nNOTE: App works without AI key (protocol library + heuristics).\nPaste key in .env.local then restart: npm run dev"
    );
  }

  console.log(
    failed
      ? `\n${failed} check(s) failed.`
      : "\nAll functional checks passed."
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

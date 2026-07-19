const base = "http://localhost:3000";

async function main() {
  const jar = new Map();

  function storeCookies(res) {
    const raw = res.headers.getSetCookie?.() || [];
    for (const c of raw) {
      const [pair] = c.split(";");
      const [k, v] = pair.split("=");
      jar.set(k, v);
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
      json = text;
    }
    return { status: res.status, json };
  }

  console.log("stadiums", await req("/api/stadiums"));

  console.log(
    "login volunteer",
    await req("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "volunteer",
        name: "Alex Rivera",
        stadium_id: "metlife_2026",
        stadium_pin: "WC26-MET",
      }),
    })
  );

  console.log(
    "cat A",
    await req("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Where is the nearest ADA elevator to Gate 3?",
      }),
    })
  );

  console.log(
    "cat B",
    await req("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "What restaurants are best near the stadium?",
      }),
    })
  );

  console.log(
    "cat C",
    await req("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Low brochure inventory at Gate 1 info desk",
      }),
    })
  );

  console.log(
    "cat D protocol",
    await req("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Medical distress — fan collapsed near section 112, not breathing",
      }),
    })
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

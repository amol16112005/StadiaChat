const langs = ["es", "fr", "pt", "de", "ar", "ja", "ko", "zh", "it", "hi"];
for (const l of langs) {
  const d = (await import(`../src/lib/locales/${l}.json`, { with: { type: "json" } })).default;
  console.log(
    l + ":",
    d["home.navEnter"],
    "|",
    d["common.logout"],
    "|",
    d["vol.fanVoice"]
  );
}

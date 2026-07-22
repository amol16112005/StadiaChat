import { NextResponse } from "next/server";
import { getLlmProviderStatus } from "@/lib/xai";

/**
 * Public-ish health for UI badges. Does not leak API keys.
 * Reports which GenAI provider is configured as the active engine.
 */
export async function GET() {
  const status = getLlmProviderStatus();
  const online = status.active !== "heuristics";
  return NextResponse.json({
    online,
    active: status.active,
    providers: {
      google: status.google,
      xai: status.xai,
    },
    label:
      status.active === "google"
        ? "google"
        : status.active === "xai"
          ? "xai"
          : "heuristics",
  });
}

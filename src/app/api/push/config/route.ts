import { NextResponse } from "next/server";

import { getWebPushConfig } from "@/lib/server/web-push";

export async function GET() {
  const config = getWebPushConfig();

  return NextResponse.json({
    ok: true,
    enabled: config.enabled,
    publicKey: config.publicKey,
  });
}

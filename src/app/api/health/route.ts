import { NextResponse } from "next/server";

import { getEnvStatus } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "lkpp-web",
    timestamp: new Date().toISOString(),
    env: getEnvStatus(),
  });
}

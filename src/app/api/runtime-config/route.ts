import { NextResponse } from "next/server";

import { getEnvStatus, getPublicEnv } from "@/lib/env";

export async function GET() {
  const publicEnv = getPublicEnv();

  return NextResponse.json({
    ok: true,
    appUrl: publicEnv.appUrl,
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey,
    functionName: publicEnv.supabaseFunctionName,
    backendBaseUrl: publicEnv.supabaseUrl
      ? `${publicEnv.supabaseUrl}/functions/v1/${publicEnv.supabaseFunctionName}`
      : "",
    turnstileSiteKey: publicEnv.turnstileSiteKey,
    status: getEnvStatus(),
  });
}

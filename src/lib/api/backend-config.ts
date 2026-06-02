import type { PublicBackendConfig, ServerBackendSecrets } from "@/lib/api/types";
import { getPublicEnv, getServerEnv } from "@/lib/env";

export function getPublicBackendConfig(): PublicBackendConfig {
  const publicEnv = getPublicEnv();
  const supabaseUrl = publicEnv.supabaseUrl;
  const supabaseAnonKey = publicEnv.supabaseAnonKey;
  const functionName = publicEnv.supabaseFunctionName;
  const turnstileSiteKey = publicEnv.turnstileSiteKey;

  return {
    supabaseUrl,
    supabaseAnonKey,
    functionName,
    backendBaseUrl: supabaseUrl ? `${supabaseUrl}/functions/v1/${functionName}` : "",
    turnstileSiteKey,
  };
}

export function getServerBackendSecrets(): ServerBackendSecrets {
  const serverEnv = getServerEnv();

  return {
    serviceRoleKey: serverEnv.serviceRoleKey,
    turnstileSecretKey: serverEnv.turnstileSecretKey,
    turnstileSiteverifyUrl: serverEnv.turnstileSiteverifyUrl,
  };
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiEnvelope<T = unknown> = {
  ok?: boolean;
  error?: string;
} & T;

export type ApiActorHeaders = {
  userId?: string | null;
  staffId?: string | null;
};

export type ApiRequestOptions = {
  method?: HttpMethod;
  body?: BodyInit | FormData | Record<string, unknown> | null;
  headers?: Record<string, string>;
  timeoutMs?: number;
  cache?: RequestCache;
  actor?: ApiActorHeaders;
};

export type PublicBackendConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  functionName: string;
  backendBaseUrl: string;
  turnstileSiteKey: string;
};

export type ServerBackendSecrets = {
  serviceRoleKey: string;
  turnstileSecretKey: string;
  turnstileSiteverifyUrl: string;
};

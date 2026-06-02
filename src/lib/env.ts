import { z } from "zod";

function readFirst(...names: string[]) {
  for (const name of names) {
    const value = String(process.env[name] ?? "").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function readFirstOptional(...names: string[]) {
  const value = readFirst(...names);
  return value || undefined;
}

function normalizeUrlValue(value: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized.replace(/\/$/, "");
  }

  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(normalized)) {
    return `https://${normalized}`.replace(/\/$/, "");
  }

  return normalized.replace(/\/$/, "");
}

function resolveAppUrl() {
  const envValue = normalizeUrlValue(
    readFirst(
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SITE_URL",
      "VERCEL_PROJECT_PRODUCTION_URL",
      "VERCEL_BRANCH_URL",
      "VERCEL_URL",
    ),
  );

  if (envValue) {
    return envValue;
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  return "http://127.0.0.1:3200";
}

const publicEnvSchema = z.object({
  appUrl: z.string().default("http://127.0.0.1:3200"),
  supabaseUrl: z.string().default(""),
  supabaseAnonKey: z.string().default(""),
  supabaseFunctionName: z.string().default("make-server-f08d97a1"),
  turnstileSiteKey: z.string().default(""),
  webPushPublicKey: z.string().default(""),
});

const serverEnvSchema = z.object({
  supabaseAccessToken: z.string().default(""),
  supabaseProjectRef: z.string().default(""),
  serviceRoleKey: z.string().default(""),
  openaiApiKey: z.string().default(""),
  authEmailSecret: z.string().default(""),
  emailChangeSecret: z.string().default(""),
  turnstileSecretKey: z.string().default(""),
  turnstileSiteverifyUrl: z
    .string()
    .default("https://challenges.cloudflare.com/turnstile/v0/siteverify"),
  brevoSmtpHost: z.string().default("smtp-relay.brevo.com"),
  brevoSmtpPort: z.string().default("587"),
  brevoSmtpUser: z.string().default(""),
  brevoSmtpPass: z.string().default(""),
  smtpFromName: z.string().default("LKPP Antrean"),
  smtpFromEmail: z.string().default(""),
  supportInboxEmail: z.string().default("layanan@lkpp.go.id"),
  cloudflareAccountId: z.string().default(""),
  cloudflareApiToken: z.string().default(""),
  cloudflarePagesProject: z.string().default("antrian-lkpp"),
  webPushPrivateKey: z.string().default(""),
  webPushSubject: z.string().default(""),
  callingTtsProvider: z.string().default(""),
  callingTtsModel: z.string().default("gpt-4o-mini-tts"),
  callingTtsVoice: z.string().default("coral"),
  callingTtsInstructions: z.string().default(""),
  callingTtsSpeed: z.string().default("0.92"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let publicEnvCache: PublicEnv | null = null;
let serverEnvCache: ServerEnv | null = null;

export function getPublicEnv(): PublicEnv {
  if (publicEnvCache) {
    return publicEnvCache;
  }

  publicEnvCache = publicEnvSchema.parse({
    appUrl: resolveAppUrl(),
    supabaseUrl: readFirst("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"),
    supabaseAnonKey: readFirst(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ),
    supabaseFunctionName: readFirstOptional(
      "NEXT_PUBLIC_SUPABASE_FUNCTION_NAME",
      "VITE_SUPABASE_FUNCTION_NAME",
    ),
    turnstileSiteKey: readFirst(
      "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
      "VITE_TURNSTILE_SITE_KEY",
    ),
    webPushPublicKey: readFirst("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY"),
  });

  return publicEnvCache;
}

export function getServerEnv(): ServerEnv {
  if (serverEnvCache) {
    return serverEnvCache;
  }

  serverEnvCache = serverEnvSchema.parse({
    supabaseAccessToken: readFirst("SUPABASE_ACCESS_TOKEN"),
    supabaseProjectRef: readFirst("SUPABASE_PROJECT_REF"),
    serviceRoleKey: readFirst("SUPABASE_SERVICE_ROLE_KEY"),
    openaiApiKey: readFirst("OPENAI_API_KEY"),
    authEmailSecret: readFirst("LKPP_AUTH_EMAIL_SECRET"),
    emailChangeSecret: readFirst("LKPP_EMAIL_CHANGE_SECRET"),
    turnstileSecretKey: readFirst("TURNSTILE_SECRET_KEY"),
    turnstileSiteverifyUrl: readFirstOptional("TURNSTILE_SITEVERIFY_URL"),
    brevoSmtpHost: readFirstOptional("BREVO_SMTP_HOST", "SMTP_HOST"),
    brevoSmtpPort: readFirstOptional("BREVO_SMTP_PORT", "SMTP_PORT"),
    brevoSmtpUser: readFirst(
      "BREVO_SMTP_USER",
      "BREVO_SMTP_LOGIN",
      "SMTP_USER",
      "SMTP_USERNAME",
    ),
    brevoSmtpPass: readFirst(
      "BREVO_SMTP_PASS",
      "BREVO_SMTP_KEY",
      "SMTP_PASS",
      "SMTP_PASSWORD",
    ),
    smtpFromName: readFirstOptional("SMTP_FROM_NAME", "SMTP_SENDER_NAME"),
    smtpFromEmail: readFirst("SMTP_FROM_EMAIL", "SMTP_SENDER_EMAIL"),
    supportInboxEmail: readFirstOptional("SUPPORT_INBOX_EMAIL"),
    cloudflareAccountId: readFirst("CLOUDFLARE_ACCOUNT_ID"),
    cloudflareApiToken: readFirst("CLOUDFLARE_API_TOKEN"),
    cloudflarePagesProject: readFirstOptional("CLOUDFLARE_PAGES_PROJECT"),
    webPushPrivateKey: readFirst("WEB_PUSH_PRIVATE_KEY"),
    webPushSubject: readFirstOptional("WEB_PUSH_SUBJECT"),
    callingTtsProvider: readFirstOptional("CALLING_TTS_PROVIDER"),
    callingTtsModel: readFirstOptional("CALLING_TTS_MODEL"),
    callingTtsVoice: readFirstOptional("CALLING_TTS_VOICE"),
    callingTtsInstructions: readFirstOptional("CALLING_TTS_INSTRUCTIONS"),
    callingTtsSpeed: readFirstOptional("CALLING_TTS_SPEED"),
  });

  return serverEnvCache;
}

export function getEnvStatus() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return {
    backendConfigured: Boolean(
      publicEnv.supabaseUrl &&
        publicEnv.supabaseAnonKey &&
        publicEnv.supabaseFunctionName,
    ),
    turnstileConfigured: Boolean(
      publicEnv.turnstileSiteKey && serverEnv.turnstileSecretKey,
    ),
    brevoConfigured: Boolean(
      serverEnv.brevoSmtpHost &&
        serverEnv.brevoSmtpPort &&
      serverEnv.brevoSmtpUser &&
        serverEnv.brevoSmtpPass &&
        serverEnv.smtpFromEmail,
    ),
    cloudflareConfigured: Boolean(
      serverEnv.cloudflareAccountId && serverEnv.cloudflareApiToken,
    ),
    webPushConfigured: Boolean(
      publicEnv.webPushPublicKey && serverEnv.webPushPrivateKey,
    ),
    callingTtsConfigured: Boolean(serverEnv.openaiApiKey),
  };
}

import { getServerEnv } from "@/lib/env";

const DEFAULT_CALLING_TTS_MODEL = "gpt-4o-mini-tts";
const DEFAULT_CALLING_TTS_VOICE = "coral";
const DEFAULT_CALLING_TTS_SPEED = 0.92;
const DEFAULT_CALLING_TTS_INSTRUCTIONS =
  "Bacakan seluruh teks dalam Bahasa Indonesia formal dengan pengucapan Indonesia yang natural, jelas, tenang, dan profesional seperti petugas layanan publik. Eja nomor antrean dan nomor loket dengan jelas.";

export type CallingTtsConfig = {
  enabled: boolean;
  provider: "openai" | "";
  model: string;
  voice: string;
  speed: number;
  instructions: string;
};

export type CallingTtsAudioResult = {
  audio: Buffer;
  contentType: string;
};

function normalizeProvider(rawValue: string) {
  const normalized = rawValue.trim().toLowerCase();

  if (!normalized) {
    return "openai" as const;
  }

  return normalized === "openai" ? ("openai" as const) : ("" as const);
}

function normalizeSpeed(rawValue: string) {
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_CALLING_TTS_SPEED;
  }

  return Math.min(4, Math.max(0.25, parsed));
}

export function getCallingTtsConfig(): CallingTtsConfig {
  const env = getServerEnv();
  const provider = normalizeProvider(env.callingTtsProvider);
  const model = env.callingTtsModel.trim() || DEFAULT_CALLING_TTS_MODEL;
  const voice = env.callingTtsVoice.trim() || DEFAULT_CALLING_TTS_VOICE;
  const instructions =
    env.callingTtsInstructions.trim() || DEFAULT_CALLING_TTS_INSTRUCTIONS;
  const speed = normalizeSpeed(env.callingTtsSpeed);

  if (provider !== "openai" || !env.openaiApiKey) {
    return {
      enabled: false,
      provider: "",
      model,
      voice,
      speed,
      instructions,
    };
  }

  return {
    enabled: true,
    provider,
    model,
    voice,
    speed,
    instructions,
  };
}

export async function generateCallingTtsAudio(
  text: string,
): Promise<CallingTtsAudioResult> {
  const config = getCallingTtsConfig();
  const env = getServerEnv();

  if (!config.enabled || !env.openaiApiKey) {
    const error = new Error("Calling TTS is not configured.");
    (error as Error & { status?: number }).status = 503;
    throw error;
  }

  const payload: Record<string, unknown> = {
    model: config.model,
    voice: config.voice,
    input: text,
    response_format: "wav",
    speed: config.speed,
  };

  if (config.instructions && config.model.startsWith("gpt-4o-mini-tts")) {
    payload.instructions = config.instructions;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const providerMessage = await response.text().catch(() => "");
    const error = new Error(
      `Calling TTS request failed with status ${response.status}.${providerMessage ? ` ${providerMessage.slice(0, 240)}` : ""}`,
    );
    (error as Error & { status?: number }).status = 502;
    throw error;
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type")?.trim() || "audio/wav",
  };
}

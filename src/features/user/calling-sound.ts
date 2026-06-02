import { formatQueueNumberForDisplay } from "@/lib/queue-number";

let audioContext: AudioContext | null = null;
let announcementSequence = 0;
let callingTtsAvailabilityCache: boolean | null = null;
let callingTtsAvailabilityPromise: Promise<boolean> | null = null;

const activeAnnouncementSources = new Set<AudioBufferSourceNode>();
const callingTtsAudioBufferCache = new Map<string, Promise<AudioBuffer | null>>();

const CALLING_AUDIO_ENABLED_KEY = "lkpp-calling-audio-enabled-v1";
const CALLING_AUDIO_ENABLED_EVENT = "lkpp-calling-audio-enabled-change";
const CALLING_VOICE_PREVIEW_TEXT =
  "Suara panggilan LKPP sudah aktif. Silakan tunggu panggilan antrean Anda.";

export type CallingSpeechStatus = {
  supported: boolean;
  voiceCount: number;
  hasIndonesianVoice: boolean;
  hasPreferredVoice: boolean;
  hasServerTts: boolean;
};

export type CallingAudioActivationResult = {
  supported: boolean;
  activated: boolean;
  hasIndonesianVoice: boolean;
  previewPlayed: boolean;
  usedServerTts: boolean;
};

const SPOKEN_DIGIT_LABELS: Record<string, string> = {
  "0": "nol",
  "1": "satu",
  "2": "dua",
  "3": "tiga",
  "4": "empat",
  "5": "lima",
  "6": "enam",
  "7": "tujuh",
  "8": "delapan",
  "9": "sembilan",
};

const SPOKEN_LETTER_LABELS: Record<string, string> = {
  A: "a",
  B: "be",
  C: "ce",
  D: "d",
  E: "e",
  F: "ef",
  G: "ge",
  H: "ha",
  I: "i",
  J: "je",
  K: "ka",
  L: "el",
  M: "em",
  N: "en",
  O: "o",
  P: "pe",
  Q: "ki",
  R: "er",
  S: "es",
  T: "te",
  U: "u",
  V: "ve",
  W: "we",
  X: "eks",
  Y: "ye",
  Z: "zet",
};

const ANNOUNCEMENT_LEAD_IN_DELAY_MS = 180;
const ANNOUNCEMENT_POST_SPEECH_DELAY_MS = 140;
const DEFAULT_SPEECH_RATE = 0.9;

function hasOwnLabel(
  labels: Record<string, string>,
  character: string,
): character is keyof typeof labels {
  return Object.prototype.hasOwnProperty.call(labels, character);
}

function spellCharacters(value: string) {
  return value
    .split("")
    .map((character) => {
      if (hasOwnLabel(SPOKEN_DIGIT_LABELS, character)) {
        return SPOKEN_DIGIT_LABELS[character];
      }

      if (hasOwnLabel(SPOKEN_LETTER_LABELS, character)) {
        return SPOKEN_LETTER_LABELS[character];
      }

      return character;
    })
    .join(" ")
    .trim();
}

function spellIndonesianNumber(value: number): string {
  const normalized = Math.trunc(value);

  if (!Number.isFinite(normalized) || normalized < 0) {
    return "";
  }

  if (normalized < 10) {
    return SPOKEN_DIGIT_LABELS[String(normalized)];
  }

  if (normalized === 10) {
    return "sepuluh";
  }

  if (normalized === 11) {
    return "sebelas";
  }

  if (normalized < 20) {
    return `${spellIndonesianNumber(normalized - 10)} belas`;
  }

  if (normalized < 100) {
    const tens = Math.trunc(normalized / 10);
    const units = normalized % 10;
    const tensLabel = `${spellIndonesianNumber(tens)} puluh`;
    return units > 0 ? `${tensLabel} ${spellIndonesianNumber(units)}` : tensLabel;
  }

  if (normalized === 100) {
    return "seratus";
  }

  if (normalized < 200) {
    return `seratus ${spellIndonesianNumber(normalized - 100)}`;
  }

  if (normalized < 1000) {
    const hundreds = Math.trunc(normalized / 100);
    const remainder = normalized % 100;
    const hundredsLabel = `${spellIndonesianNumber(hundreds)} ratus`;
    return remainder > 0
      ? `${hundredsLabel} ${spellIndonesianNumber(remainder)}`
      : hundredsLabel;
  }

  if (normalized === 1000) {
    return "seribu";
  }

  if (normalized < 2000) {
    return `seribu ${spellIndonesianNumber(normalized - 1000)}`;
  }

  if (normalized < 1_000_000) {
    const thousands = Math.trunc(normalized / 1000);
    const remainder = normalized % 1000;
    const thousandsLabel = `${spellIndonesianNumber(thousands)} ribu`;
    return remainder > 0
      ? `${thousandsLabel} ${spellIndonesianNumber(remainder)}`
      : thousandsLabel;
  }

  return spellCharacters(String(normalized));
}

function spellNumericQueueGroup(group: string) {
  if (!/^\d+$/.test(group)) {
    return spellCharacters(group);
  }

  if (group.startsWith("0")) {
    return spellCharacters(group);
  }

  return spellIndonesianNumber(Number(group));
}

function spellQueueSegment(segment: string) {
  const groups = segment.match(/[A-Z]+|\d+/g);
  if (!groups?.length) {
    return spellCharacters(segment);
  }

  return groups
    .map((group) =>
      /^\d+$/.test(group)
        ? spellNumericQueueGroup(group)
        : spellCharacters(group),
    )
    .filter(Boolean)
    .join(" ");
}

function buildSpokenQueueSegments(queueNumber: string) {
  return formatQueueNumberForDisplay(queueNumber)
    .trim()
    .toUpperCase()
    .split("-")
    .filter(Boolean)
    .map((segment) => spellQueueSegment(segment))
    .filter(Boolean);
}

function spellCounterNumber(counterId: number) {
  const normalized = Math.trunc(counterId);
  if (!Number.isFinite(normalized) || normalized < 1) {
    return "";
  }

  return spellIndonesianNumber(normalized);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function beginAnnouncementSequence() {
  announcementSequence += 1;
  return announcementSequence;
}

function isAnnouncementSequenceCurrent(sequenceId: number) {
  return announcementSequence === sequenceId;
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioContext || audioContext.state === "closed") {
    const Context = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) {
      return null;
    }
    audioContext = new Context();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  return audioContext;
}

function dispatchCallingAudioEnabledChange(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CALLING_AUDIO_ENABLED_EVENT, {
      detail: { enabled },
    }),
  );
}

export function isCallingAudioEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(CALLING_AUDIO_ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setCallingAudioEnabled(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (enabled) {
      window.localStorage.setItem(CALLING_AUDIO_ENABLED_KEY, "1");
    } else {
      window.localStorage.removeItem(CALLING_AUDIO_ENABLED_KEY);
    }
  } catch {
    // Ignore storage failures.
  }

  dispatchCallingAudioEnabledChange(enabled);
}

export function subscribeToCallingAudioEnabled(
  onChange: (enabled: boolean) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = (event: Event) => {
    const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
    onChange(Boolean(detail?.enabled));
  };

  window.addEventListener(
    CALLING_AUDIO_ENABLED_EVENT,
    handleChange as EventListener,
  );

  return () => {
    window.removeEventListener(
      CALLING_AUDIO_ENABLED_EVENT,
      handleChange as EventListener,
    );
  };
}

function playTone(
  context: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume = 0.25,
  type: OscillatorType = "sine",
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
  gain.gain.setValueAtTime(volume, startTime + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function unlockCallingAudio() {
  if (typeof window === "undefined") {
    return;
  }

  const context = getAudioContext();
  if (context?.state === "suspended") {
    void context.resume();
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
  }
}

export function stopCallingAnnouncement() {
  announcementSequence += 1;

  if (typeof window === "undefined") {
    return;
  }

  activeAnnouncementSources.forEach((source) => {
    try {
      source.stop(0);
    } catch {
      // Ignore sources that are already stopped.
    }
  });
  activeAnnouncementSources.clear();

  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  }
}

async function readCallingTtsAvailability(force = false) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!force && callingTtsAvailabilityCache !== null) {
    return callingTtsAvailabilityCache;
  }

  if (!force && callingTtsAvailabilityPromise) {
    return callingTtsAvailabilityPromise;
  }

  callingTtsAvailabilityPromise = fetch("/api/user/calling-audio", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        callingTtsAvailabilityCache = false;
        return false;
      }

      const payload = (await response.json().catch(() => null)) as
        | { enabled?: boolean }
        | null;
      callingTtsAvailabilityCache = Boolean(payload?.enabled);
      return callingTtsAvailabilityCache;
    })
    .catch(() => {
      callingTtsAvailabilityCache = false;
      return false;
    })
    .finally(() => {
      callingTtsAvailabilityPromise = null;
    });

  return callingTtsAvailabilityPromise;
}

async function fetchCallingTtsAudioArrayBuffer(text: string) {
  const response = await fetch("/api/user/calling-audio", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  }).catch(() => null);

  if (!response?.ok) {
    if (response?.status === 503 || response?.status === 401) {
      callingTtsAvailabilityCache = false;
    }
    return null;
  }

  callingTtsAvailabilityCache = true;
  return response.arrayBuffer().catch(() => null);
}

async function decodeCallingTtsAudioBuffer(text: string) {
  const context = getAudioContext();
  if (!context) {
    return null;
  }

  const existing = callingTtsAudioBufferCache.get(text);
  if (existing) {
    return existing;
  }

  const audioBufferPromise = (async () => {
    const available = await readCallingTtsAvailability();
    if (!available) {
      return null;
    }

    const arrayBuffer = await fetchCallingTtsAudioArrayBuffer(text);
    if (!arrayBuffer) {
      return null;
    }

    try {
      return await context.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      return null;
    }
  })();

  callingTtsAudioBufferCache.set(text, audioBufferPromise);

  const resolvedBuffer = await audioBufferPromise;
  if (!resolvedBuffer) {
    callingTtsAudioBufferCache.delete(text);
  }

  return resolvedBuffer;
}

function playDecodedAnnouncementBuffer(
  buffer: AudioBuffer,
  sequenceId?: number,
) {
  return new Promise<boolean>((resolve) => {
    const context = getAudioContext();
    if (!context) {
      resolve(false);
      return;
    }

    if (
      typeof sequenceId === "number" &&
      !isAnnouncementSequenceCurrent(sequenceId)
    ) {
      resolve(false);
      return;
    }

    const source = context.createBufferSource();
    let started = false;
    let settled = false;

    const finish = (didStart: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      activeAnnouncementSources.delete(source);
      resolve(didStart);
    };

    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => finish(started);

    activeAnnouncementSources.add(source);

    try {
      source.start();
      started = true;
    } catch {
      finish(false);
      return;
    }

    window.setTimeout(() => finish(started), Math.max(buffer.duration * 1000 + 800, 6_000));
  });
}

export async function playCallingChime(sequenceId?: number) {
  const context = getAudioContext();
  if (!context) {
    return false;
  }

  const now = context.currentTime;
  playTone(context, 784, now, 0.26, 0.24, "sine");
  playTone(context, 784, now, 0.26, 0.08, "triangle");
  playTone(context, 659, now + 0.3, 0.26, 0.24, "sine");
  playTone(context, 659, now + 0.3, 0.26, 0.08, "triangle");
  playTone(context, 1047, now + 0.62, 0.4, 0.28, "sine");
  playTone(context, 1047, now + 0.62, 0.4, 0.1, "triangle");

  await new Promise((resolve) => window.setTimeout(resolve, 1_150));
  return typeof sequenceId === "number"
    ? isAnnouncementSequenceCurrent(sequenceId)
    : true;
}

function buildSpeechText(queueNumber: string, counterId?: number) {
  const spokenQueueSegments = buildSpokenQueueSegments(queueNumber);
  const spokenQueue =
    spokenQueueSegments.length > 0
      ? `${spokenQueueSegments.join(". ")}.`
      : "nomor antrean tidak tersedia.";

  if (typeof counterId === "number" && Number.isFinite(counterId) && counterId > 0) {
    const spokenCounter = spellCounterNumber(counterId) || String(counterId);
    return `Perhatian. Panggilan untuk nomor antrean. ${spokenQueue} Silakan menuju loket ${spokenCounter}. Terima kasih.`;
  }

  return `Perhatian. Panggilan untuk nomor antrean. ${spokenQueue} Silakan menuju unit layanan Anda. Terima kasih.`;
}

function normalizeVoiceMetadata(voice: SpeechSynthesisVoice) {
  return `${voice.name} ${voice.voiceURI} ${voice.lang}`.toLowerCase();
}

function isIndonesianVoice(voice: SpeechSynthesisVoice) {
  const normalizedLang = voice.lang.toLowerCase();
  const metadata = normalizeVoiceMetadata(voice);

  return (
    normalizedLang === "id-id" ||
    normalizedLang.startsWith("id-") ||
    normalizedLang === "id" ||
    metadata.includes("indonesia") ||
    metadata.includes("indonesian") ||
    metadata.includes("bahasa indonesia")
  );
}

function pickPreferredVoice(voices: SpeechSynthesisVoice[]) {
  const indonesianVoices = voices.filter(isIndonesianVoice);

  const rankVoice = (voice: SpeechSynthesisVoice) => {
    const normalizedLang = voice.lang.toLowerCase();
    const metadata = normalizeVoiceMetadata(voice);

    if (
      normalizedLang === "id-id" &&
      (metadata.includes("google") || metadata.includes("samsung"))
    ) {
      return 0;
    }

    if (normalizedLang === "id-id" && voice.localService) {
      return 1;
    }

    if (normalizedLang === "id-id") {
      return 2;
    }

    if (normalizedLang.startsWith("id-") || normalizedLang === "id") {
      return 3;
    }

    return 4;
  };

  return (
    indonesianVoices.sort((left, right) => rankVoice(left) - rankVoice(right))[0] ||
    null
  );
}

function setUtteranceVoiceUri(
  utterance: SpeechSynthesisUtterance,
  voiceUri: string,
) {
  // Some engines expose a writable voiceURI even though the DOM typings omit it.
  const utteranceWithVoiceUri = utterance as SpeechSynthesisUtterance & {
    voiceURI?: string;
  };
  utteranceWithVoiceUri.voiceURI = voiceUri;
}

function buildAnnouncementUtterance(
  text: string,
  preferredVoice: SpeechSynthesisVoice | null,
) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "id-ID";
  utterance.rate = DEFAULT_SPEECH_RATE;
  utterance.pitch = 1;
  utterance.volume = 1;

  if (preferredVoice) {
    utterance.voice = preferredVoice;
    setUtteranceVoiceUri(utterance, preferredVoice.voiceURI || "native");
  } else {
    setUtteranceVoiceUri(utterance, "");
  }

  return utterance;
}

function waitForSpeechVoices(timeoutMs = 1_500) {
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve([]);
      return;
    }

    const existingVoices = window.speechSynthesis.getVoices();
    if (existingVoices.length > 0) {
      resolve(existingVoices);
      return;
    }

    let settled = false;
    const handleVoicesChanged = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);
    window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);
  });
}

function speakUtterance(
  utterance: SpeechSynthesisUtterance,
  sequenceId?: number,
) {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }

    let settled = false;
    let started = false;

    const finish = (didStart: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(didStart);
    };

    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => finish(started);
    utterance.onerror = () => finish(started);

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    setUtteranceVoiceUri(utterance, utterance.voice?.voiceURI || "native");
    window.setTimeout(() => {
      if (
        typeof sequenceId === "number" &&
        !isAnnouncementSequenceCurrent(sequenceId)
      ) {
        finish(false);
        return;
      }

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        finish(false);
      }
    }, 120);

    window.setTimeout(() => {
      if (!started) {
        window.speechSynthesis.cancel();
        finish(false);
      }
    }, 1_800);
    window.setTimeout(() => finish(started), 15_000);
  });
}

function speakUtteranceImmediately(
  utterance: SpeechSynthesisUtterance,
  sequenceId?: number,
) {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve(false);
      return;
    }

    let settled = false;
    let started = false;

    const finish = (didStart: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(didStart);
    };

    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => finish(started);
    utterance.onerror = () => finish(started);

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      if (
        typeof sequenceId === "number" &&
        !isAnnouncementSequenceCurrent(sequenceId)
      ) {
        finish(false);
        return;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      finish(false);
      return;
    }

    window.setTimeout(() => {
      if (!started) {
        window.speechSynthesis.cancel();
        finish(false);
      }
    }, 1_500);
    window.setTimeout(() => finish(started), 15_000);
  });
}

async function playCallingAnnouncementFromServer(
  text: string,
  sequenceId?: number,
) {
  if (typeof window === "undefined") {
    return false;
  }

  const buffer = await decodeCallingTtsAudioBuffer(text);
  if (!buffer) {
    return false;
  }

  if (
    typeof sequenceId === "number" &&
    !isAnnouncementSequenceCurrent(sequenceId)
  ) {
    return false;
  }

  return playDecodedAnnouncementBuffer(buffer, sequenceId);
}

export async function speakCallingAnnouncement(
  queueNumber: string,
  counterId?: number,
  sequenceId?: number,
) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!isCallingAudioEnabled()) {
    return false;
  }

  const text = buildSpeechText(queueNumber, counterId);
  const serverPlaybackStarted = await playCallingAnnouncementFromServer(
    text,
    sequenceId,
  );
  if (serverPlaybackStarted) {
    return true;
  }

  if (!("speechSynthesis" in window)) {
    return false;
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (
      typeof sequenceId === "number" &&
      !isAnnouncementSequenceCurrent(sequenceId)
    ) {
      return false;
    }

    const voices = await waitForSpeechVoices();
    const preferredVoice = pickPreferredVoice(voices);
    if (!preferredVoice) {
      return false;
    }

    const utterance = buildAnnouncementUtterance(text, preferredVoice);
    const started = await speakUtterance(utterance, sequenceId);
    if (started) {
      return true;
    }

    await wait(220);
  }

  return false;
}

export function speakCallingAnnouncementImmediately(
  queueNumber: string,
  counterId?: number,
) {
  return new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (!isCallingAudioEnabled()) {
      resolve(false);
      return;
    }

    const sequenceId = beginAnnouncementSequence();
    const text = buildSpeechText(queueNumber, counterId);

    void playCallingAnnouncementFromServer(text, sequenceId).then(
      (serverStarted) => {
        if (serverStarted) {
          resolve(true);
          return;
        }

        if (!("speechSynthesis" in window)) {
          resolve(false);
          return;
        }

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = pickPreferredVoice(voices);
        if (!preferredVoice) {
          resolve(false);
          return;
        }

        const utterance = buildAnnouncementUtterance(text, preferredVoice);
        void speakUtteranceImmediately(utterance, sequenceId).then(resolve);
      },
    );
  });
}

export async function readCallingSpeechStatus(): Promise<CallingSpeechStatus> {
  const serverTtsAvailable = await readCallingTtsAvailability();

  if (typeof window === "undefined") {
    return {
      supported: false,
      voiceCount: 0,
      hasIndonesianVoice: false,
      hasPreferredVoice: false,
      hasServerTts: false,
    };
  }

  if (!("speechSynthesis" in window)) {
    return {
      supported: serverTtsAvailable,
      voiceCount: 0,
      hasIndonesianVoice: serverTtsAvailable,
      hasPreferredVoice: serverTtsAvailable,
      hasServerTts: serverTtsAvailable,
    };
  }

  const voices = await waitForSpeechVoices();
  return {
    supported: true,
    voiceCount: voices.length,
    hasIndonesianVoice:
      serverTtsAvailable || voices.some(isIndonesianVoice),
    hasPreferredVoice:
      serverTtsAvailable || Boolean(pickPreferredVoice(voices)),
    hasServerTts: serverTtsAvailable,
  };
}

export async function activateCallingAudio() {
  if (typeof window === "undefined") {
    return {
      supported: false,
      activated: false,
      hasIndonesianVoice: false,
      previewPlayed: false,
      usedServerTts: false,
    } satisfies CallingAudioActivationResult;
  }

  unlockCallingAudio();
  const serverPreviewPlayed = await playCallingAnnouncementFromServer(
    CALLING_VOICE_PREVIEW_TEXT,
  );

  if (serverPreviewPlayed) {
    setCallingAudioEnabled(true);
    callingTtsAvailabilityCache = true;
    return {
      supported: true,
      activated: true,
      hasIndonesianVoice: true,
      previewPlayed: true,
      usedServerTts: true,
    } satisfies CallingAudioActivationResult;
  }

  if (!("speechSynthesis" in window)) {
    const hasServerTts = await readCallingTtsAvailability(true);
    return {
      supported: hasServerTts,
      activated: false,
      hasIndonesianVoice: hasServerTts,
      previewPlayed: false,
      usedServerTts: false,
    } satisfies CallingAudioActivationResult;
  }

  const existingVoices = window.speechSynthesis.getVoices();
  let preferredVoice = pickPreferredVoice(existingVoices);

  if (preferredVoice) {
    const previewUtterance = buildAnnouncementUtterance(
      CALLING_VOICE_PREVIEW_TEXT,
      preferredVoice,
    );
    const previewPlayed = await speakUtteranceImmediately(previewUtterance);

    if (previewPlayed) {
      setCallingAudioEnabled(true);
    }

    return {
      supported: true,
      activated: previewPlayed,
      hasIndonesianVoice: true,
      previewPlayed,
      usedServerTts: false,
    } satisfies CallingAudioActivationResult;
  }

  const voices = await waitForSpeechVoices();
  preferredVoice = pickPreferredVoice(voices);

  if (!preferredVoice) {
    setCallingAudioEnabled(false);
    return {
      supported: true,
      activated: false,
      hasIndonesianVoice: voices.some(isIndonesianVoice),
      previewPlayed: false,
      usedServerTts: false,
    } satisfies CallingAudioActivationResult;
  }

  const utterance = buildAnnouncementUtterance(
    CALLING_VOICE_PREVIEW_TEXT,
    preferredVoice,
  );
  const previewPlayed = await speakUtterance(utterance);

  if (previewPlayed) {
    setCallingAudioEnabled(true);
  }

  return {
    supported: true,
    activated: previewPlayed,
    hasIndonesianVoice: true,
    previewPlayed,
    usedServerTts: false,
  } satisfies CallingAudioActivationResult;
}

export async function playFullCallingAnnouncement(queueNumber: string, counterId?: number) {
  const sequenceId = beginAnnouncementSequence();
  const preChimeCompleted = await playCallingChime(sequenceId);
  if (!preChimeCompleted) {
    return false;
  }

  await wait(ANNOUNCEMENT_LEAD_IN_DELAY_MS);
  if (!isAnnouncementSequenceCurrent(sequenceId)) {
    return false;
  }

  const speechStarted = await speakCallingAnnouncement(
    queueNumber,
    counterId,
    sequenceId,
  );

  if (!isAnnouncementSequenceCurrent(sequenceId)) {
    return false;
  }

  await wait(ANNOUNCEMENT_POST_SPEECH_DELAY_MS);
  if (!isAnnouncementSequenceCurrent(sequenceId)) {
    return false;
  }

  await playCallingChime(sequenceId);
  return speechStarted;
}

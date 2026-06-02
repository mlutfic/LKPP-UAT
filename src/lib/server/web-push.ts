import crypto from "node:crypto";

import { getPublicEnv, getServerEnv } from "@/lib/env";

type KvRow = {
  key?: string | null;
  value?: unknown;
};

type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type StoredPushSubscription = {
  endpoint: string;
  keys: PushSubscriptionKeys;
  createdAt: string;
  updatedAt: string;
  userAgent?: string;
};

type StoredUserPushSubscriptionState = {
  kind: "user-web-push-subscriptions";
  userId: string;
  subscriptions: StoredPushSubscription[];
  updatedAt: string;
};

type StoredEndpointBinding = {
  kind: "web-push-endpoint-binding";
  endpointHash: string;
  endpoint: string;
  userId: string;
  updatedAt: string;
};

export type WebPushSubscriptionInput = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  } | null;
};

type PushSendResult =
  | { ok: true }
  | { ok: false; expired: boolean; message: string };

const USER_PUSH_SUBSCRIPTIONS_KEY_PREFIX = "push:user:";
const PUSH_ENDPOINT_BINDING_KEY_PREFIX = "push:endpoint:";
const VAPID_JWT_TTL_SEC = 12 * 60 * 60;
const WEB_PUSH_RECORD_SIZE = 4096;
const WEB_PUSH_KEY_INFO_PREFIX = Buffer.from("WebPush: info\0", "utf8");
const WEB_PUSH_CONTENT_ENCODING_INFO = Buffer.from(
  "Content-Encoding: aes128gcm\0",
  "utf8",
);
const WEB_PUSH_NONCE_INFO = Buffer.from("Content-Encoding: nonce\0", "utf8");

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSupabaseServerConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  if (!publicEnv.supabaseUrl || !serverEnv.serviceRoleKey) {
    throw new Error("Konfigurasi server Web Push belum lengkap.");
  }

  return {
    supabaseUrl: publicEnv.supabaseUrl,
    serviceRoleKey: serverEnv.serviceRoleKey,
  };
}

function buildRestUrl(path: string, params?: Record<string, string>) {
  const { supabaseUrl } = getSupabaseServerConfig();
  const url = new URL(`${supabaseUrl}/rest/v1/${path}`);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function buildRestHeaders() {
  const { serviceRoleKey } = getSupabaseServerConfig();

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
  };
}

async function fetchRestRows<T>(path: string, params?: Record<string, string>) {
  const response = await fetch(buildRestUrl(path, params), {
    method: "GET",
    headers: buildRestHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Gagal membaca data Web Push (${response.status}).`);
  }

  return (await response.json()) as T[];
}

async function deleteKvRow(key: string) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { key: `eq.${key}` }),
    {
      method: "DELETE",
      headers: {
        ...buildRestHeaders(),
        Prefer: "return=minimal",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Gagal menghapus data Web Push.");
  }
}

async function upsertKvRow(key: string, value: unknown) {
  const response = await fetch(
    buildRestUrl("kv_store_f08d97a1", { on_conflict: "key" }),
    {
      method: "POST",
      headers: {
        ...buildRestHeaders(),
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ key, value }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Gagal menyimpan data Web Push.");
  }
}

async function getKvRow(key: string) {
  const rows = await fetchRestRows<KvRow>("kv_store_f08d97a1", {
    select: "key,value",
    key: `eq.${key}`,
    limit: "1",
  });

  return rows[0] ?? null;
}

function buildUserSubscriptionsKey(userId: string) {
  return `${USER_PUSH_SUBSCRIPTIONS_KEY_PREFIX}${userId}`;
}

function buildEndpointBindingKey(endpointHash: string) {
  return `${PUSH_ENDPOINT_BINDING_KEY_PREFIX}${endpointHash}`;
}

function hashEndpoint(endpoint: string) {
  return crypto.createHash("sha256").update(endpoint).digest("base64url");
}

function normalizeStoredPushSubscription(input: unknown): StoredPushSubscription | null {
  const record = isRecord(input) ? input : null;
  if (!record) {
    return null;
  }

  const endpoint = asString(record.endpoint);
  const keys = isRecord(record.keys) ? record.keys : null;
  const p256dh = asString(keys?.p256dh);
  const auth = asString(keys?.auth);

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    keys: { p256dh, auth },
    createdAt: asString(record.createdAt) || new Date(0).toISOString(),
    updatedAt: asString(record.updatedAt) || new Date(0).toISOString(),
    userAgent: asString(record.userAgent) || undefined,
  };
}

function normalizeUserPushSubscriptionState(
  userId: string,
  input: unknown,
): StoredUserPushSubscriptionState {
  const record = isRecord(input) ? input : {};
  const rawSubscriptions = Array.isArray(record.subscriptions)
    ? record.subscriptions
    : [];

  return {
    kind: "user-web-push-subscriptions",
    userId,
    subscriptions: rawSubscriptions
      .map((item) => normalizeStoredPushSubscription(item))
      .filter((item): item is StoredPushSubscription => Boolean(item)),
    updatedAt: asString(record.updatedAt),
  };
}

function normalizeEndpointBinding(
  endpointHash: string,
  input: unknown,
): StoredEndpointBinding | null {
  const record = isRecord(input) ? input : null;
  if (!record) {
    return null;
  }

  const endpoint = asString(record.endpoint);
  const userId = asString(record.userId);
  if (!endpoint || !userId) {
    return null;
  }

  return {
    kind: "web-push-endpoint-binding",
    endpointHash,
    endpoint,
    userId,
    updatedAt: asString(record.updatedAt) || new Date(0).toISOString(),
  };
}

async function readUserPushSubscriptionState(userId: string) {
  const normalizedUserId = asString(userId);
  const row = await getKvRow(buildUserSubscriptionsKey(normalizedUserId));
  return normalizeUserPushSubscriptionState(normalizedUserId, row?.value);
}

async function writeUserPushSubscriptionState(state: StoredUserPushSubscriptionState) {
  const key = buildUserSubscriptionsKey(state.userId);
  if (state.subscriptions.length === 0) {
    await deleteKvRow(key).catch(() => undefined);
    return;
  }

  await upsertKvRow(key, state);
}

async function readEndpointBinding(endpointHash: string) {
  const row = await getKvRow(buildEndpointBindingKey(endpointHash));
  return normalizeEndpointBinding(endpointHash, row?.value);
}

async function writeEndpointBinding(binding: StoredEndpointBinding) {
  const key = buildEndpointBindingKey(binding.endpointHash);
  await upsertKvRow(key, binding);
}

async function removeEndpointFromUserState(userId: string, endpoint: string) {
  const state = await readUserPushSubscriptionState(userId);
  const nextSubscriptions = state.subscriptions.filter(
    (subscription) => subscription.endpoint !== endpoint,
  );

  await writeUserPushSubscriptionState({
    ...state,
    subscriptions: nextSubscriptions,
    updatedAt: new Date().toISOString(),
  });
}

function normalizeSubscriptionInput(
  subscription: WebPushSubscriptionInput,
): StoredPushSubscription {
  const endpoint = asString(subscription.endpoint);
  const p256dh = asString(subscription.keys?.p256dh);
  const auth = asString(subscription.keys?.auth);

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Subscription browser belum lengkap.");
  }

  const now = new Date().toISOString();

  return {
    endpoint,
    keys: { p256dh, auth },
    createdAt: now,
    updatedAt: now,
  };
}

export function getWebPushConfig() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();
  const publicKey = asString(publicEnv.webPushPublicKey);
  const privateKey = asString(serverEnv.webPushPrivateKey);
  const subject =
    asString(serverEnv.webPushSubject) ||
    `mailto:${asString(serverEnv.supportInboxEmail) || "layanan@lkpp.go.id"}`;

  return {
    enabled: Boolean(publicKey && privateKey && subject),
    publicKey,
    privateKey,
    subject,
  };
}

export async function upsertUserPushSubscription(args: {
  userId: string;
  subscription: WebPushSubscriptionInput;
  userAgent?: string;
}) {
  const userId = asString(args.userId);
  if (!userId) {
    throw new Error("Sesi user untuk Web Push tidak valid.");
  }

  const normalized = normalizeSubscriptionInput(args.subscription);
  const endpointHash = hashEndpoint(normalized.endpoint);
  const now = new Date().toISOString();
  const existingBinding = await readEndpointBinding(endpointHash);

  if (existingBinding?.userId && existingBinding.userId !== userId) {
    await removeEndpointFromUserState(existingBinding.userId, normalized.endpoint);
  }

  const state = await readUserPushSubscriptionState(userId);
  const existingSubscription = state.subscriptions.find(
    (subscription) => subscription.endpoint === normalized.endpoint,
  );
  const nextSubscription: StoredPushSubscription = {
    ...normalized,
    createdAt: existingSubscription?.createdAt || now,
    updatedAt: now,
    userAgent: asString(args.userAgent) || existingSubscription?.userAgent,
  };
  const nextSubscriptions = state.subscriptions
    .filter((subscription) => subscription.endpoint !== normalized.endpoint)
    .concat(nextSubscription);

  await writeUserPushSubscriptionState({
    kind: "user-web-push-subscriptions",
    userId,
    subscriptions: nextSubscriptions,
    updatedAt: now,
  });
  await writeEndpointBinding({
    kind: "web-push-endpoint-binding",
    endpointHash,
    endpoint: normalized.endpoint,
    userId,
    updatedAt: now,
  });

  return {
    endpointHash,
    subscriptionCount: nextSubscriptions.length,
  };
}

export async function removeUserPushSubscription(args: {
  userId: string;
  endpoint?: unknown;
}) {
  const userId = asString(args.userId);
  const endpoint = asString(args.endpoint);

  if (!userId || !endpoint) {
    return { removed: false, subscriptionCount: 0 };
  }

  const state = await readUserPushSubscriptionState(userId);
  const nextSubscriptions = state.subscriptions.filter(
    (subscription) => subscription.endpoint !== endpoint,
  );

  await writeUserPushSubscriptionState({
    ...state,
    subscriptions: nextSubscriptions,
    updatedAt: new Date().toISOString(),
  });

  const endpointHash = hashEndpoint(endpoint);
  const binding = await readEndpointBinding(endpointHash);
  if (binding?.userId === userId) {
    await deleteKvRow(buildEndpointBindingKey(endpointHash)).catch(() => undefined);
  }

  return {
    removed: nextSubscriptions.length !== state.subscriptions.length,
    subscriptionCount: nextSubscriptions.length,
  };
}

export async function listUserPushSubscriptions(userId: string) {
  const state = await readUserPushSubscriptionState(asString(userId));
  return state.subscriptions;
}

function base64UrlToBuffer(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function bufferToBase64Url(value: Buffer | Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function createP256PublicKeyFromBytes(value: Buffer) {
  if (value.length !== 65 || value[0] !== 0x04) {
    throw new Error("WEB PUSH public key subscription tidak valid.");
  }

  return crypto.createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: bufferToBase64Url(value.subarray(1, 33)),
      y: bufferToBase64Url(value.subarray(33, 65)),
    },
    format: "jwk",
  });
}

function exportP256PublicKeyBytes(key: crypto.KeyObject) {
  const jwk = key.export({ format: "jwk" });
  const x =
    jwk && typeof jwk === "object" && typeof jwk.x === "string" ? jwk.x.trim() : "";
  const y =
    jwk && typeof jwk === "object" && typeof jwk.y === "string" ? jwk.y.trim() : "";

  if (!x || !y) {
    throw new Error("Gagal menyiapkan public key Web Push.");
  }

  const xBytes = base64UrlToBuffer(x);
  const yBytes = base64UrlToBuffer(y);
  if (xBytes.length !== 32 || yBytes.length !== 32) {
    throw new Error("Public key Web Push tidak valid.");
  }

  return Buffer.concat([Buffer.from([0x04]), xBytes, yBytes]);
}

function hkdfExtract(salt: Buffer, inputKeyMaterial: Buffer) {
  return crypto.createHmac("sha256", salt).update(inputKeyMaterial).digest();
}

function hkdfExpand(pseudoRandomKey: Buffer, info: Buffer, length: number) {
  const chunks: Buffer[] = [];
  let block = Buffer.alloc(0);
  let generatedLength = 0;
  let counter = 1;

  while (generatedLength < length) {
    block = crypto
      .createHmac("sha256", pseudoRandomKey)
      .update(block)
      .update(info)
      .update(Buffer.from([counter]))
      .digest();
    chunks.push(block);
    generatedLength += block.length;
    counter += 1;
  }

  return Buffer.concat(chunks, generatedLength).subarray(0, length);
}

function buildEncryptedPushBody(
  subscription: StoredPushSubscription,
  payload: unknown,
) {
  const message = Buffer.from(JSON.stringify(payload), "utf8");
  const uaPublicKeyBytes = base64UrlToBuffer(subscription.keys.p256dh);
  const authSecret = base64UrlToBuffer(subscription.keys.auth);
  const receiverKey = createP256PublicKeyFromBytes(uaPublicKeyBytes);
  const { publicKey: senderPublicKey, privateKey: senderPrivateKey } =
    crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const senderPublicKeyBytes = exportP256PublicKeyBytes(senderPublicKey);
  const sharedSecret = crypto.diffieHellman({
    privateKey: senderPrivateKey,
    publicKey: receiverKey,
  });
  const initialKeyMaterial = hkdfExpand(
    hkdfExtract(authSecret, sharedSecret),
    Buffer.concat([WEB_PUSH_KEY_INFO_PREFIX, uaPublicKeyBytes, senderPublicKeyBytes]),
    32,
  );
  const salt = crypto.randomBytes(16);
  const pseudoRandomKey = hkdfExtract(salt, initialKeyMaterial);
  const contentEncryptionKey = hkdfExpand(
    pseudoRandomKey,
    WEB_PUSH_CONTENT_ENCODING_INFO,
    16,
  );
  const nonce = hkdfExpand(pseudoRandomKey, WEB_PUSH_NONCE_INFO, 12);
  const plaintext = Buffer.concat([message, Buffer.from([0x02])]);
  const recordSize = Math.max(WEB_PUSH_RECORD_SIZE, plaintext.length + 17);
  const cipher = crypto.createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const encryptedRecord = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const recordSizeBuffer = Buffer.alloc(4);
  recordSizeBuffer.writeUInt32BE(recordSize, 0);

  return Buffer.concat([
    salt,
    recordSizeBuffer,
    Buffer.from([senderPublicKeyBytes.length]),
    senderPublicKeyBytes,
    encryptedRecord,
  ]);
}

let vapidSigningKeyCache: crypto.KeyObject | null = null;

function getVapidSigningKey() {
  if (vapidSigningKeyCache) {
    return vapidSigningKeyCache;
  }

  const { enabled, publicKey, privateKey } = getWebPushConfig();
  if (!enabled) {
    throw new Error("VAPID Web Push belum dikonfigurasi.");
  }

  const publicKeyBytes = base64UrlToBuffer(publicKey);
  const privateKeyBytes = base64UrlToBuffer(privateKey);

  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error("WEB PUSH public key tidak valid.");
  }

  if (privateKeyBytes.length !== 32) {
    throw new Error("WEB PUSH private key tidak valid.");
  }

  vapidSigningKeyCache = crypto.createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: bufferToBase64Url(publicKeyBytes.subarray(1, 33)),
      y: bufferToBase64Url(publicKeyBytes.subarray(33, 65)),
      d: bufferToBase64Url(privateKeyBytes),
    },
    format: "jwk",
  });

  return vapidSigningKeyCache;
}

function createVapidJwt(audience: string) {
  const { subject } = getWebPushConfig();
  const header = bufferToBase64Url(
    Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT" }), "utf8"),
  );
  const payload = bufferToBase64Url(
    Buffer.from(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + VAPID_JWT_TTL_SEC,
        sub: subject,
      }),
      "utf8",
    ),
  );
  const unsignedToken = `${header}.${payload}`;
  const signer = crypto.createSign("SHA256");
  signer.update(unsignedToken);
  signer.end();

  const signature = signer.sign({
    key: getVapidSigningKey(),
    dsaEncoding: "ieee-p1363",
  });

  return `${unsignedToken}.${bufferToBase64Url(signature)}`;
}

async function sendSilentPushToSubscription(
  subscription: StoredPushSubscription,
  payload?: unknown,
): Promise<PushSendResult> {
  const { enabled, publicKey } = getWebPushConfig();
  if (!enabled) {
    return { ok: false, expired: false, message: "Web Push belum dikonfigurasi." };
  }

  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const vapidJwt = createVapidJwt(audience);
  const encryptedBody =
    typeof payload === "undefined"
      ? null
      : buildEncryptedPushBody(subscription, payload);
  const headers: Record<string, string> = {
    TTL: "60",
    Urgency: "high",
    Topic: "lkpp-calling",
    Authorization: `vapid t=${vapidJwt}, k=${publicKey}`,
    "Crypto-Key": `p256ecdsa=${publicKey}`,
  };

  if (encryptedBody) {
    headers["Content-Encoding"] = "aes128gcm";
    headers["Content-Type"] = "application/octet-stream";
  }

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers,
    body: encryptedBody ?? undefined,
    cache: "no-store",
  });

  if (response.ok) {
    return { ok: true };
  }

  const body = await response.text().catch(() => "");
  return {
    ok: false,
    expired: response.status === 404 || response.status === 410,
    message: body || `HTTP ${response.status}`,
  };
}

export async function sendSilentPushToUser(userId: string, payload?: unknown) {
  const subscriptions = await listUserPushSubscriptions(userId);
  const expiredEndpoints: string[] = [];

  for (const subscription of subscriptions) {
    try {
      const result = await sendSilentPushToSubscription(subscription, payload);
      if (!result.ok && result.expired) {
        expiredEndpoints.push(subscription.endpoint);
      }
    } catch {
      // Ignore push delivery errors so queue logic never fails.
    }
  }

  for (const endpoint of expiredEndpoints) {
    await removeUserPushSubscription({ userId, endpoint }).catch(() => undefined);
  }

  return {
    attempted: subscriptions.length,
    removedExpired: expiredEndpoints.length,
  };
}

import crypto from "node:crypto";

import { getServerEnv } from "@/lib/env";

type UserProfileSessionTokenPayload = {
  userId: string;
  issuedAt: string;
  expiresAt: string;
};

const USER_PROFILE_SESSION_TTL_SEC = 8 * 60 * 60;

function getUserProfileSessionSecret() {
  const serverEnv = getServerEnv();
  const secret =
    serverEnv.authEmailSecret || serverEnv.emailChangeSecret || serverEnv.serviceRoleKey;

  if (!secret) {
    throw new Error("Secret sesi profil pengguna belum tersedia.");
  }

  return secret;
}

export function issueUserProfileSessionToken(userId: string) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) {
    throw new Error("User ID tidak valid untuk token sesi profil.");
  }

  const payload: UserProfileSessionTokenPayload = {
    userId: normalizedUserId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + USER_PROFILE_SESSION_TTL_SEC * 1000).toISOString(),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getUserProfileSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyUserProfileSessionToken(token: string, userId: string) {
  const [encodedPayload, signature] = String(token || "").trim().split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", getUserProfileSessionSecret())
    .update(encodedPayload)
    .digest("base64url");

  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as UserProfileSessionTokenPayload;
    const normalizedUserId = String(userId || "").trim();
    if (!payload.userId || payload.userId !== normalizedUserId) {
      return false;
    }
    if (!payload.expiresAt || new Date(payload.expiresAt).getTime() <= Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

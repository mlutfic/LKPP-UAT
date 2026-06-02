import { apiRequest } from "@/lib/api/client";

async function localApiRequest<T = unknown>(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  } & T;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || "Permintaan auth lokal gagal.");
  }

  return payload;
}

export function loginUser(
  email: string,
  password: string,
  turnstileToken?: string,
) {
  return localApiRequest<{ user: unknown; profileToken?: string }>("/api/auth/user-login", {
    email,
    password,
    turnstileToken,
  });
}

type ChallengeDestination = {
  email?: string;
};

type AuthUserResponse = {
  user: unknown;
  profileToken?: string;
};

type RegisterVerificationResponse = {
  verificationToken?: string;
  expiresInSec?: number;
  email?: string;
  phone?: string;
  user?: unknown;
  profileToken?: string;
};

type RegisterVerificationStatusResponse = {
  status?: string;
  challengeId?: string;
  email?: string;
  phone?: string;
  verificationToken?: string;
  expiresInSec?: number;
  destination?: ChallengeDestination;
  user?: unknown;
  profileToken?: string;
};

export function registerUser(payload: {
  name: string;
  phone: string;
  email: string;
  password: string;
  asalInstansi?: string;
  namaInstansi?: string;
  nik?: string;
  provinsi?: string;
  kabupatenKota?: string;
  verificationToken?: string;
}) {
  if (String(payload.verificationToken || "").trim().startsWith("lkppv1_")) {
    return localApiRequest<AuthUserResponse>("/api/auth/register/complete", {
      ...payload,
      password: payload.password,
    });
  }

  return apiRequest<AuthUserResponse>("/auth/register", {
    method: "POST",
    body: {
      ...payload,
      pin: payload.password,
    },
  });
}

export function loginStaff(
  login: string,
  password: string,
  turnstileToken?: string,
) {
  return localApiRequest<{
    staff: unknown;
    requiresPasswordReset?: boolean;
    resetToken?: string;
  }>("/api/auth/staff-login", {
    login,
    password,
    turnstileToken,
  });
}

export function confirmStaffPasswordReset(payload: {
  resetToken: string;
  newPassword: string;
}) {
  return localApiRequest<{ staff?: unknown }>("/api/auth/staff-password-reset/confirm", {
    resetToken: payload.resetToken,
    newPassword: payload.newPassword,
  });
}

export function sendRegisterVerification(payload: {
  name: string;
  phone: string;
  email: string;
  password: string;
}) {
  return localApiRequest<{
    challengeId?: string;
    challengeToken?: string;
    expiresInSec?: number;
    destination?: ChallengeDestination;
    reused?: boolean;
    provider?: string;
  }>("/api/auth/register-verification/request", {
    ...payload,
  });
}

export function verifyRegisterVerification(
  challengeId: string,
  emailOtp: string,
  challengeToken?: string,
) {
  if (String(challengeToken || "").trim().startsWith("lkppv1_")) {
    return localApiRequest<RegisterVerificationResponse>(
      "/api/auth/register-verification/verify-otp",
      {
      challengeId,
      challengeToken,
      emailOtp,
      },
    );
  }

  return apiRequest<RegisterVerificationResponse>("/auth/register/verify", {
    method: "POST",
    body: { challengeId, emailOtp },
  });
}

export function verifyRegisterVerificationLink(payload: {
  challengeId?: string;
  accessToken?: string;
  emailAuthToken?: string;
}) {
  if (String(payload.emailAuthToken || "").trim().startsWith("lkppv1_")) {
    return localApiRequest<RegisterVerificationResponse>(
      "/api/auth/register-verification/verify-link",
      {
      emailAuthToken: payload.emailAuthToken,
      },
    );
  }

  return apiRequest<RegisterVerificationResponse>("/auth/register/verify-link", {
    method: "POST",
    body: { challengeId: payload.challengeId, accessToken: payload.accessToken },
  });
}

export function getRegisterVerificationStatus(
  challengeId: string,
  email: string,
  phone: string,
) {
  return apiRequest<RegisterVerificationStatusResponse>("/auth/register/status", {
    method: "POST",
    body: { challengeId, email, phone },
  });
}

export function requestUserPasswordReset(email: string) {
  return localApiRequest<{
    challengeId?: string;
    challengeToken?: string;
    expiresInSec?: number;
    destination?: ChallengeDestination;
    reused?: boolean;
    provider?: string;
  }>("/api/auth/user-password-reset/request", {
    email,
  });
}

export function getUserPasswordResetStatus(challengeId: string, email: string) {
  return apiRequest<{
    status?: string;
    challengeId?: string;
    email?: string;
    verificationToken?: string;
    expiresInSec?: number;
    destination?: ChallengeDestination;
  }>("/auth/user-password-reset/status", {
    method: "POST",
    body: { challengeId, email },
  });
}

export function verifyUserPasswordResetLink(payload: {
  challengeId?: string;
  accessToken?: string;
  emailAuthToken?: string;
}) {
  if (String(payload.emailAuthToken || "").trim().startsWith("lkppv1_")) {
    return localApiRequest<{
      verificationToken?: string;
      expiresInSec?: number;
      email?: string;
    }>("/api/auth/user-password-reset/verify-link", {
      emailAuthToken: payload.emailAuthToken,
    });
  }

  return apiRequest<{
    verificationToken?: string;
    expiresInSec?: number;
    email?: string;
  }>("/auth/user-password-reset/verify-link", {
    method: "POST",
    body: { challengeId: payload.challengeId, accessToken: payload.accessToken },
  });
}

export function confirmUserPasswordReset(payload: {
  challengeId?: string;
  challengeToken?: string;
  emailOtp?: string;
  verificationToken?: string;
  newPassword: string;
}) {
  if (
    String(payload.verificationToken || "").trim().startsWith("lkppv1_") ||
    String(payload.challengeToken || "").trim().startsWith("lkppv1_")
  ) {
    return localApiRequest<{ user?: unknown }>("/api/auth/user-password-reset/confirm", {
      ...payload,
      newPassword: payload.newPassword,
    });
  }

  return apiRequest<{ user?: unknown }>("/auth/user-password-reset/confirm", {
    method: "POST",
    body: {
      ...payload,
      newPin: payload.newPassword,
    },
  });
}

export function updateUserProfile(
  payload: {
    name?: string;
    phone?: string;
    asalInstansi?: string;
    namaInstansi?: string;
    nik?: string;
    provinsi?: string;
    kabupatenKota?: string;
  },
) {
  return localApiRequest<{ user: unknown }>("/api/auth/user-profile", {
    ...payload,
  });
}

export function uploadUserPhoto(userId: string, file: File) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest(`/users/${userId}/photo`, {
    method: "POST",
    body,
    timeoutMs: 30000,
  });
}

export function sendUserVerification(userId: string) {
  return localApiRequest<{
    challengeId?: string;
    expiresInSec?: number;
    destination?: ChallengeDestination;
    provider?: string;
  }>("/api/auth/user-verification/request", {
    userId,
  });
}

export function verifyUserVerificationLink(payload: {
  challengeId?: string;
  accessToken?: string;
  emailAuthToken?: string;
}) {
  if (String(payload.emailAuthToken || "").trim().startsWith("lkppv1_")) {
    return localApiRequest<{ user?: unknown; email?: string }>(
      "/api/auth/user-verification/verify-link",
      {
        emailAuthToken: payload.emailAuthToken,
      },
    );
  }

  return apiRequest<{ user?: unknown; email?: string }>(
    "/auth/user-verification/verify-link",
    {
      method: "POST",
      body: {
        challengeId: payload.challengeId,
        accessToken: payload.accessToken,
      },
    },
  );
}

export function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  return apiRequest(`/users/${userId}/password`, {
    method: "POST",
    body: { currentPin: currentPassword, newPin: newPassword },
    actor: { userId },
  });
}

export function requestUserEmailChange(
  userId: string,
  payload: {
    newEmail: string;
    currentPassword: string;
  },
) {
  return localApiRequest<{
    expiresInSec?: number;
    destination?: ChallengeDestination;
    reused?: boolean;
  }>(`/api/auth/user-email-change/request`, {
    userId,
    newEmail: payload.newEmail,
    currentPassword: payload.currentPassword,
  });
}

export function confirmUserEmailChange(emailChangeToken: string) {
  return localApiRequest<{ user?: unknown; email?: string }>(`/api/auth/user-email-change/confirm`, {
    emailChangeToken,
  });
}

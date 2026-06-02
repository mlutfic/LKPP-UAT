import {
  MOCK_AUTH_COOKIE_NAME,
  MOCK_AUTH_SESSION_MAX_AGE,
  type MockSession,
  getSessionRedirectPath,
  getStaffRedirectPath,
  inferStaffRoleFromEmail,
  isInternalRole,
  normalizeMockSession,
  parseMockSessionCookieValue,
  serializeMockSessionCookieValue,
} from "@/lib/auth-session";

export const MOCK_AUTH_SESSION_KEY = "lkpp-auth-session";

export {
  type MockSession,
  getSessionRedirectPath,
  getStaffRedirectPath,
  inferStaffRoleFromEmail,
  isInternalRole,
};

export function persistMockSession(session: MockSession) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSession = normalizeMockSession(session) ?? session;
  window.sessionStorage.setItem(MOCK_AUTH_SESSION_KEY, JSON.stringify(normalizedSession));
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${MOCK_AUTH_COOKIE_NAME}=${serializeMockSessionCookieValue(normalizedSession)}; path=/; max-age=${MOCK_AUTH_SESSION_MAX_AGE}; samesite=lax${secure}`;
}

export function readMockSession(): MockSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(MOCK_AUTH_SESSION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<MockSession>;
      const normalized = normalizeMockSession(parsed);
      if (normalized) {
        window.sessionStorage.setItem(MOCK_AUTH_SESSION_KEY, JSON.stringify(normalized));
        return normalized;
      }
      window.sessionStorage.removeItem(MOCK_AUTH_SESSION_KEY);
    } catch {
      window.sessionStorage.removeItem(MOCK_AUTH_SESSION_KEY);
    }
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MOCK_AUTH_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = parseMockSessionCookieValue(cookieValue);

  if (session) {
    window.sessionStorage.setItem(MOCK_AUTH_SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

export function clearMockSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(MOCK_AUTH_SESSION_KEY);
  document.cookie = `${MOCK_AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
}

"use client";

import * as React from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  confirmUserEmailChange,
  loginUser,
  verifyRegisterVerificationLink,
  verifyUserPasswordResetLink,
  verifyUserVerificationLink,
} from "@/lib/api/auth";
import { persistMockSession, readMockSession } from "@/lib/mock-auth";
import { syncMockUserProfileFromLiveUser } from "@/lib/mock-user-profile";

type AuthEmailCallbackBridgeProps = {
  authFlow?: string;
  challengeId?: string;
};

const REGISTER_PENDING_KEY = "lkpp-register-pending";

type PendingRegisterSession = {
  email?: string;
  password?: string;
};

function readSearchParams() {
  if (typeof window === "undefined")
    return {
      search: new URLSearchParams(),
      hashParams: new URLSearchParams(),
    };
  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  return { search, hashParams };
}

function readParamValue(
  searchParams: URLSearchParams,
  hashParams: URLSearchParams,
  keys: string[],
) {
  for (const key of keys) {
    const fromSearch = searchParams.get(key);
    if (fromSearch && String(fromSearch).trim()) {
      return String(fromSearch).trim();
    }

    const fromHash = hashParams.get(key);
    if (fromHash && String(fromHash).trim()) {
      return String(fromHash).trim();
    }
  }

  return "";
}

function readTokens(searchParams: URLSearchParams, hashParams: URLSearchParams) {
  return readParamValue(searchParams, hashParams, [
    "access_token",
    "accessToken",
    "token",
  ]);
}

function readEmailChangeToken(
  searchParams: URLSearchParams,
  hashParams: URLSearchParams,
) {
  return readParamValue(searchParams, hashParams, [
    "emailChangeToken",
    "email_change_token",
  ]);
}

function readEmailAuthToken(
  searchParams: URLSearchParams,
  hashParams: URLSearchParams,
) {
  return readParamValue(searchParams, hashParams, [
    "emailAuthToken",
    "email_auth_token",
  ]);
}

function clearCallbackUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const keysToClear = [
    "authFlow",
    "auth_flow",
    "flow",
    "challengeId",
    "challenge_id",
    "challenge",
    "emailAuthToken",
    "email_auth_token",
    "emailChangeToken",
    "email_change_token",
    "access_token",
    "accessToken",
    "token",
    "verified",
  ];

  keysToClear.forEach((key) => {
    url.searchParams.delete(key);
  });

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  keysToClear.forEach((key) => {
    hashParams.delete(key);
  });
  url.hash = hashParams.toString() ? `#${hashParams.toString()}` : "";
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

function readPendingRegisterSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(REGISTER_PENDING_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingRegisterSession;
  } catch {
    return null;
  }
}

export function AuthEmailCallbackBridge({
  authFlow,
  challengeId,
}: AuthEmailCallbackBridgeProps) {
  const router = useRouter();
  const [processing, setProcessing] = React.useState(false);
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const { search, hashParams } = readSearchParams();
    const normalizedFlow = String(
      authFlow || readParamValue(search, hashParams, ["authFlow", "auth_flow", "flow"]) || "",
    )
      .trim()
      .toLowerCase();
    const normalizedChallengeId = String(
      challengeId ||
        readParamValue(search, hashParams, ["challengeId", "challenge_id", "challenge"]) ||
        "",
    ).trim();
    const accessToken = readTokens(search, hashParams);
    const emailAuthToken = readEmailAuthToken(search, hashParams);
    const emailChangeToken = readEmailChangeToken(search, hashParams);

    if (!normalizedFlow) {
      return;
    }

    if (
      normalizedFlow !== "user-email-change" &&
      !emailAuthToken &&
      (!normalizedChallengeId || !accessToken)
    ) {
      return;
    }

    if (normalizedFlow === "user-email-change" && !emailChangeToken) {
      return;
    }

    let cancelled = false;

    async function run() {
      setProcessing(true);

      try {
        if (normalizedFlow === "register-email") {
          setMessage("Memproses konfirmasi email pendaftaran...");
          const result = await verifyRegisterVerificationLink(
            emailAuthToken
              ? { emailAuthToken }
              : {
                  challengeId: normalizedChallengeId,
                  accessToken,
                },
          );
          if (cancelled) return;

          const user =
            result.user && typeof result.user === "object"
              ? (result.user as Record<string, unknown>)
              : null;

          clearCallbackUrl();

          if (user && typeof user.id === "string") {
            const pendingRegister = readPendingRegisterSession();
            const confirmedEmail =
              typeof user.email === "string" && user.email.trim() ? user.email : "";

            if (
              pendingRegister?.password &&
              pendingRegister.email &&
              confirmedEmail &&
              pendingRegister.email.trim().toLowerCase() === confirmedEmail.toLowerCase()
            ) {
              try {
                const loginResult = await loginUser(
                  confirmedEmail,
                  pendingRegister.password,
                );
                const liveUser =
                  loginResult.user && typeof loginResult.user === "object"
                    ? (loginResult.user as Record<string, unknown>)
                    : null;

                if (liveUser && typeof liveUser.id === "string") {
                  persistMockSession({
                    authMode: "live",
                    variant: "user",
                    email:
                      typeof liveUser.email === "string" && liveUser.email.trim()
                        ? liveUser.email
                        : confirmedEmail,
                    displayName:
                      typeof liveUser.name === "string" && liveUser.name.trim()
                        ? liveUser.name
                        : undefined,
                    userId: liveUser.id,
                    userProfileToken:
                      typeof loginResult.profileToken === "string" &&
                      loginResult.profileToken.trim()
                        ? loginResult.profileToken
                        : undefined,
                    redirectTo: "/dashboard",
                    signedInAt: new Date().toISOString(),
                  });
                  syncMockUserProfileFromLiveUser(liveUser);
                  toast.success("Email berhasil dikonfirmasi.");
                  router.replace("/dashboard");
                  return;
                }
              } catch {
                // Fall through to login screen if auto sign-in cannot be completed safely.
              }
            }

            const loginParams = new URLSearchParams();
            if (confirmedEmail) {
              loginParams.set("email", confirmedEmail);
            }
            loginParams.set("verified", "1");
            toast.success("Email berhasil dikonfirmasi.");
            router.replace(`/login?${loginParams.toString()}`);
            return;
          }

          const next = new URLSearchParams();
          next.set("challengeId", normalizedChallengeId);
          if (typeof result.email === "string" && result.email.trim()) {
            next.set("email", result.email);
          }
          if (typeof result.phone === "string" && result.phone.trim()) {
            next.set("phone", result.phone);
          }
          if (
            typeof result.verificationToken === "string" &&
            result.verificationToken.trim()
          ) {
            next.set("verificationToken", result.verificationToken);
          }
          toast.success("Email berhasil dikonfirmasi.");
          router.replace(`/register?${next.toString()}`);
          return;
        }

        if (normalizedFlow === "reset-password") {
          setMessage("Memproses email reset password...");
          const result = await verifyUserPasswordResetLink(
            emailAuthToken
              ? { emailAuthToken }
              : {
                  challengeId: normalizedChallengeId,
                  accessToken,
                },
          );
          if (cancelled) return;

          clearCallbackUrl();

          const next = new URLSearchParams();
          next.set("challengeId", normalizedChallengeId);
          if (typeof result.email === "string" && result.email.trim()) {
            next.set("email", result.email);
          }
          if (
            typeof result.verificationToken === "string" &&
            result.verificationToken.trim()
          ) {
            next.set("verificationToken", result.verificationToken);
          }
          toast.success("Email reset password berhasil dikonfirmasi.");
          router.replace(`/reset?${next.toString()}`);
          return;
        }

        if (normalizedFlow === "user-verification") {
          setMessage("Memproses verifikasi email akun...");
          const result = await verifyUserVerificationLink(
            emailAuthToken
              ? { emailAuthToken }
              : {
                  challengeId: normalizedChallengeId,
                  accessToken,
                },
          );
          if (cancelled) return;

          const currentSession = readMockSession();
          clearCallbackUrl();
          toast.success("Email akun berhasil dikonfirmasi.");

          if (
            currentSession?.authMode === "live" &&
            currentSession.userId &&
            result.user &&
            typeof result.user === "object"
          ) {
            syncMockUserProfileFromLiveUser(result.user as Record<string, unknown>);
            router.replace("/profil");
            return;
          }

          const next = new URLSearchParams();
          if (typeof result.email === "string" && result.email.trim()) {
            next.set("email", result.email);
          }
          next.set("verified", "1");
          router.replace(`/login?${next.toString()}`);
          return;
        }

        if (normalizedFlow === "user-email-change") {
          setMessage("Memproses perubahan email akun...");
          const result = await confirmUserEmailChange(emailChangeToken);
          if (cancelled) return;

          const currentSession = readMockSession();
          clearCallbackUrl();
          toast.success("Email akun berhasil diperbarui.");

          if (
            currentSession?.authMode === "live" &&
            currentSession.userId &&
            result.user &&
            typeof result.user === "object"
          ) {
            const user = result.user as Record<string, unknown>;
            persistMockSession({
              ...currentSession,
              email:
                typeof user.email === "string" && user.email.trim()
                  ? user.email
                  : currentSession.email,
              displayName:
                typeof user.name === "string" && user.name.trim()
                  ? user.name
                  : currentSession.displayName,
            });
            syncMockUserProfileFromLiveUser(user);
            router.replace("/profil");
            return;
          }

          const next = new URLSearchParams();
          if (typeof result.email === "string" && result.email.trim()) {
            next.set("email", result.email);
          }
          router.replace(`/login?${next.toString()}`);
          return;
        }
      } catch (error) {
        if (cancelled) return;
        const nextMessage =
          error instanceof Error
            ? error.message
            : "Gagal memproses tautan email.";
        clearCallbackUrl();
        toast.error(nextMessage);
        router.replace("/");
      } finally {
        if (!cancelled) {
          setProcessing(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [authFlow, challengeId, router]);

  if (!processing) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[28px] border border-border bg-white px-6 py-6 shadow-(--shadow-float)">
        <div className="flex items-start gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-role-accent-soft text-role-accent">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold">Memproses tautan email</p>
            <p className="text-sm leading-6 text-muted-foreground">
              {message || "Mohon tunggu sebentar."}
            </p>
          </div>
          <Loader2 className="ml-auto size-5 animate-spin text-role-accent" />
        </div>
      </div>
    </div>
  );
}

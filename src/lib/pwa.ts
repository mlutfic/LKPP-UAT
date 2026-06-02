"use client";

function getNavigatorWithStandalone() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.navigator as Navigator & { standalone?: boolean };
}

export function isLocalhostHost(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function isLocalhost() {
  if (typeof window === "undefined") {
    return false;
  }

  return isLocalhostHost(window.location.hostname);
}

export function isMobileInstallSurface() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  return /iphone|ipod|android.+mobile|mobile|windows phone/i.test(userAgent);
}

export function isAppleMobileDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform || "";

  return (
    /iphone|ipad|ipod/i.test(userAgent) ||
    (platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

export function isStandaloneMode() {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = getNavigatorWithStandalone();

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone?.standalone === true
  );
}

export function requiresHomeScreenInstallForWebPush() {
  return isAppleMobileDevice() && !isStandaloneMode();
}

export function hasWebPushBrowserSupport() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in window.navigator &&
    "PushManager" in window
  );
}

export function canUseWebPushOnCurrentSurface() {
  return hasWebPushBrowserSupport() && !requiresHomeScreenInstallForWebPush();
}

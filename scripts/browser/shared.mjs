import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function parseArgValue(argv, name, fallback = undefined) {
  const index = argv.findIndex((entry) => entry === name);
  if (index === -1 || index === argv.length - 1) {
    return fallback;
  }
  return argv[index + 1];
}

export function parseCommonOptions(argv) {
  const port = Number.parseInt(parseArgValue(argv, "--port", "9222"), 10);
  const url = parseArgValue(argv, "--url");
  const profileDir =
    parseArgValue(argv, "--profile") ||
    path.join(os.homedir(), ".codex-browser", "profiles", "lkpp-fe-baru-web");

  return {
    port: Number.isFinite(port) ? port : 9222,
    profileDir,
    url,
  };
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function resolveChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Chrome binary tidak ditemukan. Set env CHROME_PATH kalau lokasi Chrome Anda non-standar.",
  );
}

export async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request gagal ${response.status} untuk ${url}`);
  }
  return response.json();
}

export async function isDebuggerReady(port) {
  try {
    await fetchJson(`http://127.0.0.1:${port}/json/version`);
    return true;
  } catch {
    return false;
  }
}

export async function waitForDebugger(port, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isDebuggerReady(port)) {
      return fetchJson(`http://127.0.0.1:${port}/json/version`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(
    `Chrome CDP tidak muncul di port ${port} dalam ${timeoutMs}ms. Cek apakah Chrome berhasil jalan.`,
  );
}

export function printUsageLines(lines) {
  console.log(lines.join("\n"));
}

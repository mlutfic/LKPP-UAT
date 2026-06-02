import { spawn } from "node:child_process";

import {
  ensureDir,
  parseCommonOptions,
  printUsageLines,
  resolveChromeBinary,
  waitForDebugger,
} from "./shared.mjs";

const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  printUsageLines([
    "Pakai:",
    "  npm run browser:chrome:start -- --url https://example.com",
    "Opsional:",
    "  --port 9222",
    "  --profile /path/ke/profile",
  ]);
  process.exit(0);
}

const options = parseCommonOptions(argv);
const chromeBinary = resolveChromeBinary();

ensureDir(options.profileDir);

const chromeArgs = [
  `--remote-debugging-port=${options.port}`,
  `--user-data-dir=${options.profileDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-search-engine-choice-screen",
  options.url || "about:blank",
];

spawn(chromeBinary, chromeArgs, {
  detached: true,
  stdio: "ignore",
}).unref();

const version = await waitForDebugger(options.port);

printUsageLines([
  "Chrome operator mode aktif.",
  `Port CDP      : ${options.port}`,
  `Profile dir   : ${options.profileDir}`,
  `Browser       : ${version.Browser || "unknown"}`,
  `WS endpoint   : ${version.webSocketDebuggerUrl}`,
  "",
  "Command lanjut:",
  "  npm run browser:chrome:doctor",
  "  npm run browser:task:example -- --url https://example.com",
  "  npm run browser:task -- ./scripts/browser/tasks/example-read-page.mjs -- --url https://example.com",
]);

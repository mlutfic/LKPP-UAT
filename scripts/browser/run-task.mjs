import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { parseCommonOptions, printUsageLines } from "./shared.mjs";

const argv = process.argv.slice(2);

if (argv.length === 0 || argv.includes("--help")) {
  printUsageLines([
    "Pakai:",
    "  npm run browser:task -- ./scripts/browser/tasks/example-read-page.mjs -- --url https://example.com",
    "",
    "Catatan:",
    "  Argumen sebelum -- adalah path task module.",
    "  Argumen setelah -- diteruskan ke task module.",
  ]);
  process.exit(argv.includes("--help") ? 0 : 1);
}

const separatorIndex = argv.indexOf("--");
const taskArgv = separatorIndex === -1 ? argv : argv.slice(0, separatorIndex);
const forwardedArgv = separatorIndex === -1 ? [] : argv.slice(separatorIndex + 1);
const [taskModulePath] = taskArgv;

if (!taskModulePath) {
  throw new Error("Task module path wajib diisi.");
}

const commonOptions = parseCommonOptions([...taskArgv, ...forwardedArgv]);
const cdpEndpoint = process.env.PLAYWRIGHT_CDP_URL || `http://127.0.0.1:${commonOptions.port}`;

const importedModule = await import(
  pathToFileURL(path.resolve(process.cwd(), taskModulePath)).href
);

if (typeof importedModule.default !== "function") {
  throw new Error(`Task ${taskModulePath} harus export default async function.`);
}

const browser = await chromium.connectOverCDP(cdpEndpoint);
const context = browser.contexts()[0] || (await browser.newContext());

const existingPages = context.pages();
let page =
  existingPages.find((entry) => entry.url() && entry.url() !== "about:blank") ||
  existingPages.at(-1) ||
  (await context.newPage());

if (commonOptions.url) {
  const matchedPage = existingPages.find((entry) => entry.url().startsWith(commonOptions.url));
  if (matchedPage) {
    page = matchedPage;
  } else {
    await page.goto(commonOptions.url, { waitUntil: "domcontentloaded" });
  }
}

const result = await importedModule.default({
  argv: forwardedArgv,
  browser,
  context,
  cdpEndpoint,
  page,
});

if (result !== undefined) {
  if (typeof result === "string") {
    console.log(result);
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

await browser.close();

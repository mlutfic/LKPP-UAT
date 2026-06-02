import { fetchJson, parseCommonOptions, printUsageLines } from "./shared.mjs";

const argv = process.argv.slice(2);

if (argv.includes("--help")) {
  printUsageLines([
    "Pakai:",
    "  npm run browser:chrome:doctor",
    "Opsional:",
    "  --port 9222",
  ]);
  process.exit(0);
}

const { port } = parseCommonOptions(argv);
const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
const pages = await fetchJson(`http://127.0.0.1:${port}/json/list`);

printUsageLines([
  `Port        : ${port}`,
  `Browser     : ${version.Browser || "unknown"}`,
  `User-Agent  : ${version["User-Agent"] || "unknown"}`,
  `WS endpoint : ${version.webSocketDebuggerUrl}`,
  "",
  "Pages:",
  ...pages.map((page, index) => {
    const title = page.title || "(tanpa judul)";
    const url = page.url || "(tanpa url)";
    return `  ${index + 1}. ${title} -> ${url}`;
  }),
]);

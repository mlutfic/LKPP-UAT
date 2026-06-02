import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

const chromeCandidates = [
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].filter(Boolean);

const rootDir = process.cwd();
const inputArg = process.argv[2] ?? "BLUEPRINT.md";
const outputArg = process.argv[3] ?? inputArg.replace(/\.md$/i, ".pdf");

const inputPath = path.resolve(rootDir, inputArg);
const outputPath = path.resolve(rootDir, outputArg);

async function resolveChromePath() {
  for (const candidate of chromeCandidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  throw new Error(
    "Chrome/Chromium tidak ditemukan. Set CHROME_BIN atau pastikan Google Chrome terpasang.",
  );
}

function buildHtml(markdown, title) {
  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        --bg: #ffffff;
        --fg: #111827;
        --muted: #4b5563;
        --line: #e5e7eb;
        --soft: #f8fafc;
        --code-bg: #0f172a;
        --code-fg: #e2e8f0;
        --accent: #af101a;
      }

      * { box-sizing: border-box; }
      html { font-size: 14px; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--fg);
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }

      .page {
        max-width: 980px;
        margin: 0 auto;
        padding: 40px 40px 64px;
      }

      h1, h2, h3, h4, h5, h6 {
        color: #0f172a;
        line-height: 1.2;
        margin: 1.4em 0 0.55em;
        page-break-after: avoid;
      }

      h1 {
        font-size: 2.2rem;
        margin-top: 0;
        letter-spacing: -0.03em;
      }

      h2 {
        font-size: 1.5rem;
        padding-top: 0.3rem;
        border-top: 1px solid var(--line);
      }

      h3 { font-size: 1.18rem; }
      h4 { font-size: 1rem; }

      p, ul, ol, blockquote, table, pre {
        margin: 0 0 1rem;
      }

      p, li {
        color: var(--fg);
      }

      strong { color: #0f172a; }

      a {
        color: var(--accent);
        text-decoration: none;
      }

      blockquote {
        margin-left: 0;
        padding: 0.9rem 1rem;
        border-left: 4px solid var(--accent);
        background: #fff5f5;
        color: var(--muted);
      }

      code {
        font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;
        font-size: 0.92em;
        background: #f3f4f6;
        color: #7f1d1d;
        padding: 0.15rem 0.35rem;
        border-radius: 6px;
      }

      pre {
        background: var(--code-bg);
        color: var(--code-fg);
        padding: 1rem 1.1rem;
        border-radius: 14px;
        overflow: hidden;
        white-space: pre-wrap;
        word-break: break-word;
        page-break-inside: avoid;
      }

      pre code {
        background: transparent;
        color: inherit;
        padding: 0;
        border-radius: 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      th, td {
        border: 1px solid var(--line);
        padding: 0.7rem 0.75rem;
        text-align: left;
        vertical-align: top;
        word-break: break-word;
      }

      th {
        background: var(--soft);
        color: #0f172a;
        font-weight: 700;
      }

      hr {
        border: none;
        border-top: 1px solid var(--line);
        margin: 1.5rem 0;
      }

      ul, ol {
        padding-left: 1.25rem;
      }

      li + li {
        margin-top: 0.35rem;
      }

      @media print {
        .page {
          padding: 0;
        }
        h1, h2, h3, h4, table, pre, blockquote {
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <article id="content"></article>
    </main>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script>
      const markdown = ${JSON.stringify(markdown)};
      marked.setOptions({
        gfm: true,
        breaks: false,
        headerIds: false,
        mangle: false
      });
      document.getElementById("content").innerHTML = marked.parse(markdown);
    </script>
  </body>
</html>`;
}

async function main() {
  const markdown = await fs.readFile(inputPath, "utf8");
  const chromePath = await resolveChromePath();
  const title = path.basename(inputPath, path.extname(inputPath));
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1800 },
      deviceScaleFactor: 1,
    });

    await page.setContent(buildHtml(markdown, title), {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() => {
      const content = document.querySelector("#content");
      return Boolean(content && content.textContent && content.textContent.length > 100);
    });

    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "18mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },
      displayHeaderFooter: true,
      headerTemplate:
        '<div style="width:100%;font-size:9px;color:#6b7280;padding:0 14mm;text-align:right;"><span></span></div>',
      footerTemplate:
        '<div style="width:100%;font-size:9px;color:#6b7280;padding:0 14mm;display:flex;justify-content:space-between;"><span>' +
        title +
        '</span><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    });
  } finally {
    await browser.close();
  }

  console.log(`PDF berhasil dibuat: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

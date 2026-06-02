function normalizeText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

export default async function metaSnapshot({ page }) {
  await page.waitForLoadState("domcontentloaded");

  const title = await page.title();
  const url = page.url();
  const bodyText = normalizeText(await page.locator("body").innerText().catch(() => ""));
  const headingTexts = await page
    .locator("h1, h2, h3")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .slice(0, 20),
    )
    .catch(() => []);

  const indicators = {
    looksLikeLogin:
      /facebook|meta/i.test(title) &&
      /(masuk|log in|login|kata sandi|email|password|buat akun)/i.test(bodyText),
    looksLikeDeveloperDashboard:
      /developers\.facebook\.com/.test(url) &&
      /(dashboard|dasbor|pengaturan|produk|app review|izin dan fitur)/i.test(bodyText),
    looksLikePermissionError:
      /(anda tidak memiliki akses|you do not have access|access denied|permission)/i.test(bodyText),
  };

  return {
    title,
    url,
    indicators,
    headings: headingTexts,
    bodyPreview: bodyText.slice(0, 1200),
  };
}

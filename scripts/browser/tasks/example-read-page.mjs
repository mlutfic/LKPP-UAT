export default async function exampleReadPage({ page }) {
  await page.waitForLoadState("domcontentloaded");

  const [title, url, headingCount, linkCount] = await Promise.all([
    page.title(),
    page.url(),
    page.locator("h1, h2").count(),
    page.locator("a").count(),
  ]);

  return {
    title,
    url,
    headingCount,
    linkCount,
  };
}

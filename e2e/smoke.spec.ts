import { test, expect } from "@playwright/test";

test("landing renders primary navigation", async ({ page }) => {
  await page.goto("/");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Masuk", exact: true })).toBeVisible();
  await expect(header.getByRole("link", { name: "Daftar", exact: true })).toBeVisible();
});

test("health endpoint responds", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
});

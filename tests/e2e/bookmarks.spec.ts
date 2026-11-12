import { expect, test } from "@playwright/test";

// Bookmarks: an agent adds links with a personal API token; the owner reads one and it becomes today's entry.
test("agent adds bookmarks with an API token", async ({ page, request }, info) => {
  const t = `${Math.random().toString(36).slice(2, 8)}${info.project.name[0]}`;
  const u = `bm_${t}`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${u}@example.com`);
  await page.getByLabel("Username").fill(u);
  await page.getByLabel("Display name").fill("Bookworm");
  await page.getByLabel("Password").fill("bookworm-password-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/today");

  await page.goto("/settings");
  await page.getByLabel("Name").fill("agent");
  await page.getByRole("button", { name: "Create" }).click();
  const token = (await page.locator("code", { hasText: /^rl_/ }).textContent())!.trim();
  expect(token).toMatch(/^rl_[0-9a-f]{48}$/);

  // Without a token: refused. With it: added, duplicate skipped, missing title fetched.
  expect((await request.post("/api/bookmarks", { data: { url: "https://example.com/" } })).status()).toBe(401);
  const res = await request.post("/api/bookmarks", {
    headers: { authorization: `Bearer ${token}` },
    data: { items: [{ url: "https://example.com/", title: "Example via agent" }, { url: "https://example.com/" }] },
  });
  expect(res.status()).toBe(201);
  expect((await res.json()).added).toHaveLength(1);
  const list = await (await request.get("/api/bookmarks", { headers: { authorization: `Bearer ${token}` } })).json();
  expect(list.bookmarks.map((b: { title: string }) => b.title)).toContain("Example via agent");

  // Paste in the app.
  await page.goto("/bookmarks");
  await expect(page.getByRole("link", { name: "Example via agent" })).toBeVisible();
  await page.getByLabel("Links, one per line").fill("https://example.org/");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.locator("li", { hasText: "example.org" })).toBeVisible();

  // Read → today's entry.
  await page.locator("li", { hasText: "Example via agent" }).getByRole("button", { name: "Read" }).click();
  await expect(page.getByRole("link", { name: "Example via agent" })).toHaveCount(0);
  await page.goto("/today");
  await expect(page.getByRole("link", { name: "Example via agent" })).toBeVisible();

  // Revoked token stops working.
  await page.goto("/settings");
  await page.getByRole("button", { name: "Revoke" }).click();
  await expect(page.getByRole("button", { name: "Revoke" })).toHaveCount(0);
  expect((await request.get("/api/bookmarks", { headers: { authorization: `Bearer ${token}` } })).status()).toBe(401);
});

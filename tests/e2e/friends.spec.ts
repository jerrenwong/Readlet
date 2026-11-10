import { expect, test, type Page } from "@playwright/test";

// Two friends: sign up, log reads, request + accept, see each other's decrypted reads, leaderboard, new device.
const tag = () => Math.random().toString(36).slice(2, 8);

async function signUp(page: Page, username: string, name: string, password: string) {
  await page.goto("/welcome");
  await page.getByRole("link", { name: "Start reading" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/today");
}

async function logRead(page: Page, title: string) {
  await page.getByRole("button", { name: "+ Log a read" }).click();
  const dialog = page.getByRole("dialog", { name: "Log a read" });
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("friends see each other's encrypted reads", async ({ browser }, info) => {
  const t = `${tag()}${info.project.name[0]}`;
  const alice = { u: `alice_${t}`, pw: "alice-password-1" };
  const bob = { u: `bob_${t}`, pw: "bob-password-22" };

  const a = await (await browser.newContext()).newPage();
  await signUp(a, alice.u, "Alice", alice.pw);
  await logRead(a, `Middlemarch ${t}`);
  await expect(a.locator(".num").first()).toHaveText("1");

  const b = await (await browser.newContext()).newPage();
  await signUp(b, bob.u, "Bob", bob.pw);
  await b.goto("/friends");
  await b.getByLabel("Exact username").fill(alice.u);
  await b.getByRole("button", { name: "Find" }).click();
  await b.getByRole("button", { name: "Add friend" }).click();
  await expect(b.getByText("Sent", { exact: true }).first()).toBeVisible();

  await a.goto("/friends");
  await a.getByRole("button", { name: "Accept" }).click();
  await expect(a.getByRole("link", { name: /Bob/ })).toBeVisible();

  await b.goto("/today");
  await logRead(b, `Beloved ${t}`);
  await b.goto("/feed");
  await expect(b.getByRole("heading", { name: `Middlemarch ${t}` })).toBeVisible();
  await a.goto("/feed");
  await expect(a.getByRole("heading", { name: `Beloved ${t}` })).toBeVisible();

  await a.goto("/leaderboard");
  await expect(a.locator("li", { hasText: "Bob" })).toContainText("1");

  // New device: the password unlocks the same key.
  const a2 = await (await browser.newContext()).newPage();
  await a2.goto("/signin");
  await a2.getByLabel("Username").fill(alice.u);
  await a2.getByLabel("Password").fill(alice.pw);
  await a2.getByRole("button", { name: "Sign in" }).click();
  await expect(a2.getByRole("heading", { name: `Middlemarch ${t}` })).toBeVisible();
});

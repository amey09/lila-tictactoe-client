import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://64.227.173.59";

async function waitForOnline(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await expect(page.getByText("Online", { exact: true })).toBeVisible({ timeout: 20000 });
}

async function readLobby(page) {
  return (await page.locator(".lobby").textContent()) || "";
}

async function extractMark(page) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const text = await readLobby(page);
    const match = text.match(/Your mark\s+([XO])/);
    if (match) return match[1];
    await page.waitForTimeout(500);
  }

  throw new Error("Timed out waiting for seat assignment");
}

test("two live browser sessions join and receive seats", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await waitForOnline(pageA);
    await waitForOnline(pageB);

    await pageA.getByRole("button", { name: "Quick Match" }).click();
    await pageB.getByRole("button", { name: "Quick Match" }).click();

    const [markA, markB] = await Promise.all([extractMark(pageA), extractMark(pageB)]);
    expect(markA).not.toBe(markB);

    const playPage = markA === "X" ? pageA : pageB;
    await playPage.getByRole("button", { name: "Cell 1" }).click();

    await expect(pageA.locator(".board .cell-mark").first()).toHaveText(/[XO]/, { timeout: 10000 });
    await expect(pageB.locator(".board .cell-mark").first()).toHaveText(/[XO]/, { timeout: 10000 });
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

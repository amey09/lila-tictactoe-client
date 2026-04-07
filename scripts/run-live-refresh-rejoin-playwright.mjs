import { chromium } from "playwright";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://64.227.173.59";

async function waitForOnline(page) {
  await page.goto(baseUrl, { waitUntil: "load" });
  await page.getByText("Online", { exact: true }).waitFor({ timeout: 20000 });
}

async function waitForMatchId(page) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const text = (await page.locator("body").textContent()) || "";
    const match = text.match(/Active match\s*([0-9a-f-]+\.nakama1)/i);
    if (match) return match[1];
    await page.waitForTimeout(500);
  }

  throw new Error("Timed out waiting for created match id");
}

async function extractMark(page) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const text = (await page.locator("body").textContent()) || "";
    const match = text.match(/You are\s*([XO])/);
    if (match) return match[1];
    await page.waitForTimeout(500);
  }

  throw new Error("Timed out waiting for seat assignment");
}

async function waitForPlayableCell(page) {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const count = await page.locator(".board .cell:not([disabled])").count();
    if (count > 0) return;
    await page.waitForTimeout(500);
  }

  throw new Error("Timed out waiting for playable cell");
}

const browser = await chromium.launch({ headless: true });

try {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await waitForOnline(pageA);
  await waitForOnline(pageB);

  await pageA.getByRole("button", { name: "Create Private Match" }).click();
  const matchId = await waitForMatchId(pageA);

  await pageB.getByPlaceholder("Paste a match ID to join directly").fill(matchId);
  await pageB.getByRole("button", { name: "Join" }).click();

  const [markA, markB] = await Promise.all([extractMark(pageA), extractMark(pageB)]);
  if (markA === markB) {
    throw new Error(`Expected different marks but got ${markA} and ${markB}`);
  }

  await pageB.reload({ waitUntil: "load" });
  await pageB.getByText("Online", { exact: true }).waitFor({ timeout: 20000 });
  const rejoinedMark = await extractMark(pageB);
  if (rejoinedMark !== markB) {
    throw new Error(`Expected refreshed player to keep ${markB} but got ${rejoinedMark}`);
  }

  await waitForPlayableCell(pageA);
  await pageA.locator(".board .cell:not([disabled])").first().click();

  await pageB.waitForFunction(() => {
    const el = document.querySelector(".board .cell-mark");
    return el && el.textContent && el.textContent.trim().length > 0;
  }, { timeout: 10000 });

  const firstCellB = await pageB.locator(".board .cell-mark").first().textContent();
  if (!firstCellB) {
    throw new Error("Expected refreshed player to receive the move after rejoining");
  }

  console.log(
    JSON.stringify({
      matchId,
      markA,
      markB,
      rejoinedMark,
      firstCellB,
    }),
  );

  await contextA.close();
  await contextB.close();
} finally {
  await browser.close();
}

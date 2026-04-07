import { chromium } from "playwright";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://64.227.173.59";

async function waitForOnline(page) {
  await page.goto(baseUrl, { waitUntil: "load" });
  try {
    await page.getByText("Online", { exact: true }).waitFor({ timeout: 20000 });
  } catch (error) {
    const bodyText = (await page.locator("body").textContent()) || "";
    throw new Error(`Timed out waiting for online state. Page text: ${bodyText}`);
  }
}

async function extractMark(page) {
  const start = Date.now();
  let lastText = "";
  while (Date.now() - start < 20000) {
    const text = (await page.locator(".lobby").textContent()) || "";
    lastText = text;
    const match = text.match(/Your mark\s*([XO])/);
    if (match) return match[1];
    await page.waitForTimeout(500);
  }

  throw new Error(`Timed out waiting for seat assignment. Lobby text: ${lastText}`);
}

async function waitForMatchId(page) {
  const start = Date.now();
  let lastText = "";
  while (Date.now() - start < 20000) {
    const text = (await page.locator(".lobby").textContent()) || "";
    lastText = text;
    const match = text.match(/Active match\s*([0-9a-f-]+\.nakama1)/i);
    if (match) return match[1];
    await page.waitForTimeout(500);
  }

  throw new Error(`Unable to read created match id from lobby text: ${lastText}`);
}

async function waitForPlayablePage(pageA, pageB) {
  const start = Date.now();
  while (Date.now() - start < 15000) {
    const enabledA = await pageA.locator(".board .cell:not([disabled])").count();
    if (enabledA > 0) return pageA;

    const enabledB = await pageB.locator(".board .cell:not([disabled])").count();
    if (enabledB > 0) return pageB;

    await pageA.waitForTimeout(500);
  }

  const lobbyA = (await pageA.locator(".lobby").textContent()) || "";
  const lobbyB = (await pageB.locator(".lobby").textContent()) || "";
  throw new Error(`Timed out waiting for a playable board. A: ${lobbyA} | B: ${lobbyB}`);
}

const browser = await chromium.launch({ headless: true });

try {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await waitForOnline(pageA);
  await waitForOnline(pageB);

  await pageA.getByRole("button", { name: "Create a Private Match" }).click();
  const matchId = await waitForMatchId(pageA);

  await pageB.getByPlaceholder("Paste a match ID to join directly").fill(matchId);
  await pageB.getByRole("button", { name: "Join" }).click();

  const [markA, markB] = await Promise.all([extractMark(pageA), extractMark(pageB)]);
  if (markA === markB) {
    throw new Error(`Expected different marks but got ${markA} and ${markB}`);
  }

  const playPage = await waitForPlayablePage(pageA, pageB);
  await playPage.locator(".board .cell:not([disabled])").first().click();

  await pageA.waitForFunction(() => {
    const el = document.querySelector(".board .cell-mark");
    return el && el.textContent && el.textContent.trim().length > 0;
  }, { timeout: 10000 });

  await pageB.waitForFunction(() => {
    const el = document.querySelector(".board .cell-mark");
    return el && el.textContent && el.textContent.trim().length > 0;
  }, { timeout: 10000 });

  const cellA = await pageA.locator(".board .cell-mark").first().textContent();
  const cellB = await pageB.locator(".board .cell-mark").first().textContent();

  if (!cellA || !cellB) {
    throw new Error("Expected both pages to show the first authoritative move");
  }

  console.log(
    JSON.stringify({
      markA,
      markB,
      firstCellA: cellA,
      firstCellB: cellB,
    }),
  );

  await contextA.close();
  await contextB.close();
} finally {
  await browser.close();
}
